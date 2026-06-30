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
exports.logAttendance = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
exports.logAttendance = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'يجب تسجيل الدخول');
    }
    const { userId, type, companyId, location, photoUrl } = data;
    if (!userId || !type || !['check-in', 'check-out'].includes(type)) {
        throw new functions.https.HttpsError('invalid-argument', 'بيانات الحضور غير صالحة');
    }
    const db = admin.firestore();
    try {
        const serverTime = admin.firestore.FieldValue.serverTimestamp();
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        // Check if attendance for today already exists
        const attendanceRef = db.collection('attendance');
        const q = attendanceRef
            .where('userId', '==', userId)
            .where('date', '==', dateStr)
            .limit(1);
        const snapshot = await q.get();
        if (type === 'check-in') {
            if (!snapshot.empty) {
                throw new functions.https.HttpsError('already-exists', 'تم تسجيل الحضور اليوم مسبقاً');
            }
            await attendanceRef.add({
                userId,
                date: dateStr,
                checkIn: serverTime,
                companyId: companyId || null,
                location: location || null,
                photoUrl: photoUrl || null,
                status: data.status || 'present',
                userName: data.userName || null,
                isManual: data.isManual || false,
                department: data.department || null,
                locationName: data.locationName || null,
                distanceFromTarget: data.distanceFromTarget || -1,
                projectId: data.projectId || null
            });
            return { success: true, message: 'تم تسجيل الحضور بنجاح' };
        }
        else {
            if (snapshot.empty) {
                throw new functions.https.HttpsError('failed-precondition', 'لم يتم تسجيل حضور اليوم لتسجيل الانصراف');
            }
            const docId = snapshot.docs[0].id;
            const docData = snapshot.docs[0].data();
            if (docData.checkOut) {
                throw new functions.https.HttpsError('already-exists', 'تم تسجيل الانصراف مسبقاً');
            }
            await attendanceRef.doc(docId).update({
                checkOut: serverTime,
                checkOutLocation: location || null,
                checkOutLocationName: data.locationName || null,
                checkOutManual: data.isManual || false,
                workedMinutes: data.workedMinutes || 0,
                overtimeMinutes: data.overtimeMinutes || 0
            });
            return { success: true, message: 'تم تسجيل الانصراف بنجاح' };
        }
    }
    catch (error) {
        console.error('Error logging attendance:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'حدث خطأ أثناء معالجة بيانات الحضور والانصراف');
    }
});
//# sourceMappingURL=hr.js.map