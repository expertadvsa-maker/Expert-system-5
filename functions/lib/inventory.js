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
exports.manageInventory = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
exports.manageInventory = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'يجب تسجيل الدخول');
    }
    const { action, itemId, itemData, quantity, notes } = data;
    if (!action || !['add', 'update', 'delete', 'adjust'].includes(action)) {
        throw new functions.https.HttpsError('invalid-argument', 'نوع العملية غير صالح');
    }
    const db = admin.firestore();
    try {
        await db.runTransaction(async (t) => {
            // Handle Add New Item
            if (action === 'add') {
                const newDocRef = db.collection('inventory').doc();
                const docData = Object.assign(Object.assign({}, itemData), { companyId: itemData.companyId || null, lastUpdated: new Date().toISOString(), createdAt: new Date().toISOString(), createdBy: context.auth.uid });
                t.set(newDocRef, docData);
                // Log movement
                if (docData.quantity && Number(docData.quantity) > 0) {
                    const logRef = db.collection('inventory_logs').doc();
                    t.set(logRef, {
                        itemId: newDocRef.id,
                        itemName: docData.name,
                        type: 'in',
                        quantity: Number(docData.quantity),
                        notes: notes || 'إضافة مادة جديدة',
                        date: new Date().toISOString(),
                        createdBy: context.auth.uid,
                        companyId: itemData.companyId || null
                    });
                }
                return;
            }
            // Handle Update, Delete, Adjust
            if (!itemId) {
                throw new functions.https.HttpsError('invalid-argument', 'معرف المادة مطلوب');
            }
            const itemRef = db.collection('inventory').doc(itemId);
            const itemDoc = await t.get(itemRef);
            if (!itemDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'المادة غير موجودة في المخزون');
            }
            const currentData = itemDoc.data();
            if (action === 'delete') {
                t.delete(itemRef);
                return;
            }
            if (action === 'update') {
                t.update(itemRef, Object.assign(Object.assign({}, itemData), { lastUpdated: new Date().toISOString() }));
                return;
            }
            if (action === 'adjust') {
                if (typeof quantity !== 'number') {
                    throw new functions.https.HttpsError('invalid-argument', 'الكمية غير صالحة');
                }
                const newQuantity = Number(currentData.quantity || 0) + quantity;
                if (newQuantity < 0) {
                    throw new functions.https.HttpsError('failed-precondition', 'لا يمكن أن تكون الكمية بالسالب');
                }
                t.update(itemRef, {
                    quantity: newQuantity,
                    lastUpdated: new Date().toISOString()
                });
                // Log movement
                const logRef = db.collection('inventory_logs').doc();
                t.set(logRef, {
                    itemId: itemId,
                    itemName: currentData.name,
                    type: quantity > 0 ? 'in' : 'out',
                    quantity: Math.abs(quantity),
                    notes: notes || 'تعديل مخزون',
                    date: new Date().toISOString(),
                    createdBy: context.auth.uid,
                    companyId: currentData.companyId || null
                });
            }
        });
        return { success: true, message: 'تمت العملية بنجاح' };
    }
    catch (error) {
        console.error('Error managing inventory:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'حدث خطأ أثناء معالجة بيانات المخزون');
    }
});
//# sourceMappingURL=inventory.js.map