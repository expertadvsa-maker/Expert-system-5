import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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
    console.log("Fetching projects...");
    const projects = await getDocs(collection(db, "projects"));
    console.log(`Projects Count: ${projects.size}`);
    projects.forEach(doc => {
      const data = doc.data();
      console.log(`\nProject ID: ${doc.id}`);
      console.log(`Title: ${data.title}`);
      console.log(`PhotoUrls:`, data.photoUrls);
      console.log(`Status: ${data.status}`);
      console.log(`Milestones:`, data.milestones?.map(m => `${m.title} (${m.status})`));
    });
  } catch (e) {
    console.error("Error inspecting projects:", e);
  }
}

inspect().then(() => process.exit(0));
