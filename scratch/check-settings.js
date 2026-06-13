import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

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

import { getAuth, signInAnonymously } from "firebase/auth";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function inspect() {
  console.log("Checking Firestore settings...");
  try {
    console.log("Signing in anonymously...");
    await signInAnonymously(auth);
    console.log("Signed in successfully!");

    const settingsDoc = await getDoc(doc(db, "system", "settings"));
    if (settingsDoc.exists()) {
      console.log("Settings Document Data:", settingsDoc.data());
    } else {
      console.log("Settings Document system/settings DOES NOT EXIST!");
    }
  } catch (e) {
    console.error("Firestore Settings Error:", e);
  }
}

inspect().then(() => process.exit(0));
