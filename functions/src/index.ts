import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin (Only once)
if (!admin.apps.length) {
  admin.initializeApp();
}

// Export specific functions
export { createTransaction, approveTransaction } from './financials';
export { manageInventory } from './inventory';
export { processApproval } from './approvals';
export { logAttendance } from './hr';

const db = admin.firestore();

export const updateProjectLifecycle = functions.https.onCall(async (data, context) => {
  // Authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be authenticated to update project lifecycle."
    );
  }

  const { projectId, newStatus, materialsUsed } = data;

  if (!projectId || !newStatus) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with projectId and newStatus."
    );
  }

  try {
    return await db.runTransaction(async (transaction) => {
      const projectRef = db.collection("projects").doc(projectId);
      const projectDoc = await transaction.get(projectRef);

      if (!projectDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Project not found.");
      }

      // If materials are provided, deduct them from inventory
      if (materialsUsed && Array.isArray(materialsUsed)) {
        for (const item of materialsUsed) {
          if (!item.materialId || !item.quantity) continue;
          
          const inventoryRef = db.collection("inventory").doc(item.materialId);
          const inventoryDoc = await transaction.get(inventoryRef);
          
          if (inventoryDoc.exists) {
            const currentQty = inventoryDoc.data()?.quantity || 0;
            const updatedQty = currentQty - item.quantity;
            
            if (updatedQty < 0) {
              throw new functions.https.HttpsError(
                "failed-precondition",
                `Not enough stock for material ID: ${item.materialId}`
              );
            }
            
            transaction.update(inventoryRef, { quantity: updatedQty });
          }
        }
      }

      // Update project status
      transaction.update(projectRef, {
        status: newStatus,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastUpdatedBy: context.auth!.uid
      });

      return { success: true, message: `Project ${projectId} updated to ${newStatus}` };
    });
  } catch (error: any) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});
