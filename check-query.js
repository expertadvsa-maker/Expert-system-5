import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkQuery() {
  try {
    const q = query(collection(db, 'notifications'), orderBy('timestamp', 'desc'), limit(50));
    const snapshot = await getDocs(q);
    console.log("Query returned docs:", snapshot.size);
  } catch (err) {
    console.error("Query failed:", err);
  }
}

checkQuery().catch(console.error);
