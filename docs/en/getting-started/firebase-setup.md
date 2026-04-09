# Firebase Setup

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project**, enter a name (e.g. `clipgenius`)
3. Disable Google Analytics if prompted (not needed for this app)
4. Click **Create project**

## 2. Enable Google Auth

1. In the left sidebar, go to **Build → Authentication → Get started**
2. Click **Sign-in method** tab
3. Find **Google** and click it
4. Toggle **Enable**
5. Select a project support email
6. Click **Save**

## 3. Create a Firestore Database

1. In the left sidebar, go to **Build → Firestore Database → Create database**
2. Choose **Start in test mode** (you will add security rules next)
3. Select a Firestore location close to your users
4. Click **Enable**

## 4. Configure Firestore Security Rules

In **Firestore Database → Rules**, replace the content with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId}/pastes/{pasteId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/chats/{chatId}/messages/{messageId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Click **Publish**.

## 5. Register a Web App

1. Go to **Project Settings** (gear icon in the sidebar)
2. Scroll to **Your apps**, click the web icon (`</>`)
3. Enter an app nickname (e.g. `ClipGenius Web`)
4. **Do NOT** check "Also set up Firebase Hosting"
5. Click **Register app**
6. Copy the `firebaseConfig` object shown

## 6. Add Firebase Config to `.env`

Copy the values from the `firebaseConfig` object into your `.env` file:

```env
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_APP_ID="1:123456789:web:abcdef"
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
VITE_FIREBASE_FIRESTORE_DB="your-firestore-database-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"
```

> **Note:** `VITE_FIREBASE_FIRESTORE_DB` is the database ID shown at the top of your Firestore page (defaults to `(default)`).

## 7. Deploy Firestore Indexes

The project requires composite indexes for Firestore queries. Import `firestore.indexes.json` from the project root into your Firebase project:

1. Go to **Firestore → Indexes** in Firebase Console
2. Click **Add Index** or use the **Import indexes** option
3. Import the `firestore.indexes.json` file

Required indexes:
- Collection `pastes`: `userId (ASC)`, `updatedAt (DESC)`
- Collection `pastes`: `userId (ASC)`, `syncRev (DESC)`

## 8. Restart the Dev Server

If the dev server is running, restart it to pick up the new `.env` values:

```bash
npm run dev
```

## Verification

1. Open the app and click **Login with Google**
2. After logging in, copy some text (`Cmd/Ctrl+C`)
3. Paste it in the app (`Cmd/Ctrl+V` outside inputs)
4. Open Firebase Console → Firestore → Data
5. You should see a `users/{your-uid}/pastes/{pasteId}` document

## Troubleshooting

### "auth/developer-app-not-authorized"

Your API key may not allow requests from `localhost`. In Google Cloud Console, add `localhost` to the allowed referrers for your Firebase Web API key (under **APIs & Services → Credentials → API Key → Website restrictions**).

### "Missing or insufficient permissions"

Your Firestore security rules are blocking the request. Make sure you are signed in (guest mode does not sync) and that the rules match the format above.

### "Cloud sync not working after login"

Restart the dev server to ensure the new Firebase config is loaded. Also check the browser console for sync errors.
