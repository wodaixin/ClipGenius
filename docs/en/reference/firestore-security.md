# Firestore Security Rules

**Overview** — ClipGenius uses Firestore security rules to enforce data isolation. Each user can only read and write their own data. These rules are in `firestore.rules` in the project root.

**Assumed Data Model**

```
Collection: /users/{userId}/pastes/{pasteId}
  - id: string (required)
  - type: string (required, enum: image, text, url, video)
  - content: string (required)
  - mimeType: string (required)
  - timestamp: timestamp (required)
  - suggestedName: string (required)
  - summary: string (optional)
  - isPinned: boolean (optional)
  - userId: string (required)

Collection: /users/{userId}/chats/{chatId}/messages/{messageId}
  - id: string (required)
  - role: string (required, enum: user, model)
  - text: string (required)
  - timestamp: timestamp (required)
```

**Helper Functions**

```javascript
function isAuthenticated() {
  return request.auth != null;
}

function isOwner(userId) {
  return isAuthenticated() && request.auth.uid == userId;
}

function isValidEmail(email) {
  return email is string && email.matches("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$");
}

function isValidPaste(data) {
  return data.keys().hasAll(['id', 'type', 'content', 'mimeType', 'timestamp', 'suggestedName', 'userId']) &&
         data.type in ['image', 'text', 'url', 'video'] &&
         data.content.size() < 1048576 &&  // 1MB limit
         data.suggestedName.size() < 255 &&
         data.userId == request.auth.uid;   // userId immutability
}

function isValidMessage(data) {
  return data.keys().hasAll(['id', 'role', 'text', 'timestamp']) &&
         data.role in ['user', 'model'] &&
         data.text.size() < 5000;
}

function isAdmin() {
  return isAuthenticated() && (
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
    (request.auth.token.email == "wodaixin@gmail.com" && request.auth.token.email_verified == true)
  );
}
```

**Rules Walkthrough**

```javascript
match /users/{userId} {
  allow read, write: if isOwner(userId) || isAdmin();

  match /pastes/{pasteId} {
    allow read: if isOwner(userId) || isAdmin();
    allow create: if isOwner(userId) && isValidPaste(request.resource.data);
    allow update: if isOwner(userId) && isValidPaste(request.resource.data) &&
                     request.resource.data.userId == resource.data.userId;
    allow delete: if isOwner(userId) || isAdmin();
  }

  match /chats/{chatId}/messages/{messageId} {
    allow read: if isOwner(userId) || isAdmin();
    allow create: if isOwner(userId) && isValidMessage(request.resource.data);
    allow update: if isOwner(userId) && isValidMessage(request.resource.data);
    allow delete: if isOwner(userId) || isAdmin();
  }
}
```

Key rules:
- **Create** — requires `isOwner` AND `isValidPaste/isValidMessage` (all required fields present, correct types, size limits)
- **Update** — additionally requires `request.resource.data.userId == resource.data.userId` (userId cannot be changed after creation — prevents ownership hijacking)
- **Delete** — owner or admin only

**Security Notes**

- **⚠️ Change admin email:** Replace `"wodaixin@gmail.com"` with your own Google email in `firestore.rules`. Only the specified email with `email_verified: true` has admin access. After changing, run `firebase deploy --only firestore:rules` to apply.
- **Content size limit:** 1MB prevents abuse from large paste content
- **userId immutability:** The `userId` field cannot be changed on update, preventing one user from overwriting another's paste metadata

**Testing Rules**

Use the Firebase Emulator Suite:

```bash
npm install -g firebase-tools
firebase init emulators
firebase emulators:start
```

Test scenarios:
1. As a guest — all reads and writes should be denied
2. As a logged-in user — can only access own data
3. As the admin email — can read/write all data
