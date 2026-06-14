import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkNotifications() {
  const snapshot = await getDocs(collection(db, "notifications"));
  console.log("Total notifications:", snapshot.size);
  if (snapshot.size > 0) {
    console.log("Sample notification:", snapshot.docs[0].data());
  }
}

checkNotifications().catch(console.error);
