"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProjectLifecycle = exports.logAttendance = exports.processApproval = exports.manageInventory = exports.approveTransaction = exports.createTransaction = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin (Only once)
if (!admin.apps.length) {
    admin.initializeApp();
}
// Export specific functions
var financials_1 = require("./financials");
Object.defineProperty(exports, "createTransaction", { enumerable: true, get: function () { return financials_1.createTransaction; } });
Object.defineProperty(exports, "approveTransaction", { enumerable: true, get: function () { return financials_1.approveTransaction; } });
var inventory_1 = require("./inventory");
Object.defineProperty(exports, "manageInventory", { enumerable: true, get: function () { return inventory_1.manageInventory; } });
var approvals_1 = require("./approvals");
Object.defineProperty(exports, "processApproval", { enumerable: true, get: function () { return approvals_1.processApproval; } });
var hr_1 = require("./hr");
Object.defineProperty(exports, "logAttendance", { enumerable: true, get: function () { return hr_1.logAttendance; } });
const db = admin.firestore();
exports.updateProjectLifecycle = functions.https.onCall(async (data, context) => {
    // Authentication check
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated to update project lifecycle.");
    }
    const { projectId, newStatus, materialsUsed } = data;
    if (!projectId || !newStatus) {
        throw new functions.https.HttpsError("invalid-argument", "The function must be called with projectId and newStatus.");
    }
    try {
        return await db.runTransaction(async (transaction) => {
            var _a;
            const projectRef = db.collection("projects").doc(projectId);
            const projectDoc = await transaction.get(projectRef);
            if (!projectDoc.exists) {
                throw new functions.https.HttpsError("not-found", "Project not found.");
            }
            // If materials are provided, deduct them from inventory
            if (materialsUsed && Array.isArray(materialsUsed)) {
                for (const item of materialsUsed) {
                    if (!item.materialId || !item.quantity)
                        continue;
                    const inventoryRef = db.collection("inventory").doc(item.materialId);
                    const inventoryDoc = await transaction.get(inventoryRef);
                    if (inventoryDoc.exists) {
                        const currentQty = ((_a = inventoryDoc.data()) === null || _a === void 0 ? void 0 : _a.quantity) || 0;
                        const updatedQty = currentQty - item.quantity;
                        if (updatedQty < 0) {
                            throw new functions.https.HttpsError("failed-precondition", `Not enough stock for material ID: ${item.materialId}`);
                        }
                        transaction.update(inventoryRef, { quantity: updatedQty });
                    }
                }
            }
            // Update project status
            transaction.update(projectRef, {
                status: newStatus,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                lastUpdatedBy: context.auth.uid
            });
            return { success: true, message: `Project ${projectId} updated to ${newStatus}` };
        });
    }
    catch (error) {
        throw new functions.https.HttpsError("internal", error.message);
    }
});
//# sourceMappingURL=index.js.map