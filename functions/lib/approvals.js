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
exports.processApproval = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
exports.processApproval = functions.https.onCall(async (data, context) => {
    var _a;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'يجب تسجيل الدخول');
    }
    const { collectionName, documentId, status } = data;
    if (!collectionName || !documentId || !status) {
        throw new functions.https.HttpsError('invalid-argument', 'بيانات الاعتماد غير مكتملة');
    }
    if (!['approved', 'rejected'].includes(status)) {
        throw new functions.https.HttpsError('invalid-argument', 'حالة الاعتماد غير صالحة');
    }
    const db = admin.firestore();
    try {
        const userDoc = await db.collection('users').doc(context.auth.uid).get();
        if (!userDoc.exists || ((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== 'manager') {
            throw new functions.https.HttpsError('permission-denied', 'ليس لديك صلاحية لاعتماد الطلبات');
        }
        const docRef = db.collection(collectionName).doc(documentId);
        const targetDoc = await docRef.get();
        if (!targetDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'المستند غير موجود');
        }
        await docRef.update({
            status: status,
            approvedBy: context.auth.uid,
            approvedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return { success: true, message: `تم تحديث الحالة إلى ${status} بنجاح` };
    }
    catch (error) {
        console.error('Error processing approval:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'حدث خطأ أثناء معالجة الاعتماد');
    }
});
//# sourceMappingURL=approvals.js.map