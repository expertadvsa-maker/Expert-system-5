import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { 
  getFirestore, 
  initializeFirestore,
  doc, 
  getDocFromServer,
  enableMultiTabIndexedDbPersistence,
  enableIndexedDbPersistence
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { handleFirestoreError, OperationType } from './firestore-errors';

// standard initialization
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, firebaseConfig.firestoreDatabaseId);

// Enable offline persistence for field usage
if (typeof window !== 'undefined') {
  enableMultiTabIndexedDbPersistence(db)
    .then(() => {
      console.log('✅ Firestore offline persistence enabled successfully');
    })
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a time.
        enableIndexedDbPersistence(db)
          .then(() => {
            console.log('✅ Firestore offline persistence enabled (single tab fallback)');
          })
          .catch((singleErr) => {
            console.warn('⚠️ Firestore persistence fallback failed:', singleErr);
          });
      } else if (err.code === 'unimplemented') {
        console.warn('⚠️ Firestore persistence is unimplemented in this browser');
      } else {
        console.warn('⚠️ Firestore persistence error:', err);
      }
    });
}



export default app;
