import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({
  credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS),
});

const db = getFirestore();

async function deleteAllUsers() {
  console.log('Starting deletion of all users...');
  
  // List all user documents
  const usersSnapshot = await db.collection('users').get();
  console.log(`Found ${usersSnapshot.size} users`);
  
  let totalDocs = 0;
  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id;
    console.log(`Deleting all pastes for user: ${userId}`);
    
    const pastesSnapshot = await db.collection(`users/${userId}/pastes`).get();
    console.log(`  Deleting ${pastesSnapshot.size} pastes...`);
    
    const batch = db.batch();
    pastesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    
    totalDocs += pastesSnapshot.size;
    
    // Delete the user document itself
    await userDoc.ref.delete();
    console.log(`  Deleted user document`);
  }
  
  console.log(`\nDone! Deleted ${totalDocs} paste documents and ${usersSnapshot.size} user documents.`);
}

deleteAllUsers().catch(console.error);
