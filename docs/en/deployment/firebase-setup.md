# Firebase Setup

**Overview** — ClipGenius uses Firebase Auth (Google sign-in) and Firestore (cloud database) for cross-device sync. This guide walks through creating and configuring a Firebase project.

**1. Create a Firebase Project**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" → enter a name (e.g., `clipgenius`)
3. Enable Google Analytics (optional) → Create project
4. **Important:** Upgrade to the Blaze (pay-as-you-go) plan — Firestore requires a billing-enabled project

**2. Add a Web App**

1. In Project Settings → Your apps → Add app → Web (`</>`)
2. Register the app with a nickname
3. Copy the Firebase config — you'll paste these into your `.env` file:
   ```env
   VITE_FIREBASE_PROJECT_ID="your-project-id"
   VITE_FIREBASE_APP_ID="1:123456789:web:abcdef"
   VITE_FIREBASE_API_KEY="your-api-key"
   VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
   VITE_FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"
   VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"
   ```

**3. Enable Firestore**

1. Firebase Console → Build → Firestore Database → Create database
2. Select **Production mode** (recommended for production)
3. Choose a region close to your users
4. Note: `VITE_FIREBASE_FIRESTORE_DB` defaults to `"(default)"` — only change this if using a named database

**4. Deploy Security Rules**

The security rules in `firestore.rules` enforce data isolation per user. To deploy them:

**Option A — Firebase Console:**
1. Go to Firestore → Rules tab
2. Paste the contents of `firestore.rules`
3. Publish

**Option B — Firebase CLI:**
```bash
npm install -g firebase-tools
firebase init firestore
firebase deploy --only firestore:rules
```

See [Firestore Security Rules](../reference/firestore-security.md) for a complete walkthrough of the rules.

**5. Enable Google Auth**

1. Firebase Console → Authentication → Sign-in method
2. Click on "Google"
3. Enable it
4. Select a public-facing project name and support email
5. Complete the OAuth consent screen in Google Cloud Console if prompted

**6. Firestore Indexes**

The app uses these Firestore queries — composite indexes may be auto-created when you run the app:

| Collection | Query |
|---|---|
| `users/{uid}/pastes` | `orderBy("timestamp", "desc")` |
| `users/{uid}/chats/{chatId}/messages` | `orderBy("timestamp", "asc")` |

If you see index errors in the Firebase console, click the provided link to create the indexes automatically.

**Data Model Reference**

The data model is documented in `firebase-blueprint.json` in the project root.
