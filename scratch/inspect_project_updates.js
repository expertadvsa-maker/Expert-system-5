import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";

const firebaseConfig = {
  projectId: "expert-system-3",
  appId: "1:137723142708:web:5e31bf5648fb8fb13da061",
  apiKey: "AIzaSyBOxcdupn6Vn3Fhj3Drjk4WXvRSavSuuWM",
  authDomain: "expert-system-3.firebaseapp.com",
  firestoreDatabaseId: "(default)",
  storageBucket: "expert-system-3.firebasestorage.app",
  messagingSenderId: "137723142708",
  measurementId: "G-3P5ZHJ1S2R"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function inspectUpdates() {
  try {
    const snap = await getDocs(query(collection(db, "projectUpdates"), limit(3)));
    console.log(`Found ${snap.size} project updates:`);
    snap.forEach(doc => {
      console.log(`Doc ID: ${doc.id}`);
      console.log(JSON.stringify(doc.data(), null, 2));
      console.log("--------------------------------");
    });
  } catch (e) {
    console.error(e);
  }
}

inspectUpdates().then(() => process.exit(0));
