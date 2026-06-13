import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

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
const auth = getAuth(app);

async function clearMockPhotos() {
  console.log("Cleaning mock images from database...");
  try {
    console.log("Signing in...");
    await signInWithEmailAndPassword(auth, "admin@expert-system.com", "password123");
    console.log("Signed in successfully!");

    const projectsCol = collection(db, "projects");
    const snap = await getDocs(projectsCol);
    
    for (const projectDoc of snap.docs) {
      const data = projectDoc.data();
      const photoUrls = data.photoUrls || [];
      const cleanedUrls = photoUrls.filter(url => {
        const isMock = url.includes("unsplash.com") || url.includes("picsum.photos");
        return !isMock;
      });

      if (photoUrls.length !== cleanedUrls.length) {
        console.log(`Cleaning project: "${data.title || data.name}" (ID: ${projectDoc.id})`);
        console.log(`- Before:`, photoUrls);
        console.log(`- After:`, cleanedUrls);
        
        await updateDoc(doc(db, "projects", projectDoc.id), {
          photoUrls: cleanedUrls
        });
      }
    }
    console.log("Database cleanup complete!");
  } catch (e) {
    console.error("Error cleaning database:", e);
  }
}

clearMockPhotos().then(() => process.exit(0));
