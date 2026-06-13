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

const collectionsList = [
  "activities", "archive", "assets", "attendance", "bankAccounts", "dailyLogs",
  "employees", "financialAdjustments", "gallery", "generalTasks", "inventory",
  "inventoryLogs", "invoices", "leaveRequests", "notifications", "offices",
  "production_orders", "projectPresence", "projectUpdates", "projects",
  "quotations", "recycle_bin", "rep_private_jobs", "shares", "subcontractorNotes",
  "subcontractors", "suppliers", "system", "systemSettings", "transactions",
  "users", "workerNotifications", "workerTransactions", "worker_assignments", "workers"
];

async function inspectAll() {
  console.log("Checking all collections for document counts...");
  for (const colName of collectionsList) {
    try {
      const snap = await getDocs(collection(db, colName));
      if (snap.size > 0) {
        console.log(`🟢 Collection: ${colName} => Count: ${snap.size}`);
        // Log first document as sample
        const firstDoc = snap.docs[0];
        console.log(`   Sample doc (${firstDoc.id}):`, JSON.stringify(firstDoc.data()).substring(0, 150));
      } else {
        // console.log(`⚪ Collection: ${colName} => Count: 0`);
      }
    } catch (e) {
      console.log(`🔴 Error checking ${colName}:`, e.message);
    }
  }
}

inspectAll().then(() => process.exit(0));
