import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

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

async function inspect() {
  try {
    console.log("Fetching system/settings...");
    const snap = await getDoc(doc(db, "system", "settings"));
    if (snap.exists()) {
      const data = snap.data();
      console.log("Settings exists!");
      console.log("geminiApiKey length:", data.geminiApiKey ? data.geminiApiKey.length : "NOT FOUND");
      console.log("whatsappSettings:", data.whatsappSettings);
    } else {
      console.log("settings document does NOT exist!");
    }
  } catch (e) {
    console.error("Error inspecting settings:", e);
  }
}

inspect().then(() => process.exit(0));
