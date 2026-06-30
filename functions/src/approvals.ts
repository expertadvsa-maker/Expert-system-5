import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const processApproval = functions.https.onCall(async (data, context) => {
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
    if (!userDoc.exists || userDoc.data()?.role !== 'manager') {
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
  } catch (error: any) {
    console.error('Error processing approval:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'حدث خطأ أثناء معالجة الاعتماد');
  }
});
