import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkUser() {
  const snapshot = await getDocs(query(collection(db, "users"), where("email", "==", "expertadvsa@gmail.com")));
  if (!snapshot.empty) {
    console.log("User profile:", snapshot.docs[0].data());
  } else {
    console.log("User not found");
  }
}

checkUser().catch(console.error);
