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
    console.log("Querying Firestore without authentication...");

    const emp = await getDocs(collection(db, "employees"));
    console.log(`Employees Count: ${emp.size}`);
    emp.forEach(doc => {
      const d = doc.data();
      console.log(`- Employee: ${doc.id} => Name: ${d.name}, Role: ${d.role}, Salary: ${d.salary}`);
    });

    const inv = await getDocs(collection(db, "inventory"));
    console.log(`Inventory Count: ${inv.size}`);
    inv.forEach(doc => {
      const d = doc.data();
      console.log(`- Item: ${doc.id} => Name: ${d.name || d.itemName}, Qty: ${d.quantity || d.qty}, MinQty: ${d.minQuantity || d.minQty}`);
    });

    const leaves = await getDocs(collection(db, "leaveRequests"));
    console.log(`LeaveRequests Count: ${leaves.size}`);
    leaves.forEach(doc => {
      const d = doc.data();
      console.log(`- Leave: ${doc.id} => Emp: ${d.employeeName}, Days: ${d.duration || d.days}, Status: ${d.status}`);
    });

  } catch (e) {
    console.error("Error during inspection:", e);
  }
}
inspect().then(() => process.exit(0));
