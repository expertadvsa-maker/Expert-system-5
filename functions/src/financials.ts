import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export const createTransaction = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'يجب تسجيل الدخول لإجراء هذه العملية'
    );
  }

  const {
    type,
    category,
    amount,
    description,
    projectId,
    attachmentURL,
    status,
    referenceId,
    paymentMethod,
    bankAccountId,
    salesRepId,
    companyId
  } = data;

  if (!type || !category || typeof amount !== 'number') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'البيانات الأساسية للمعاملة غير مكتملة'
    );
  }

  const transactionRef = db.collection('transactions').doc();
  const transactionData: any = {
    id: transactionRef.id,
    type,
    category,
    amount,
    description: description || '',
    date: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: context.auth.uid,
    status: status || 'pending'
  };

  if (projectId) transactionData.projectId = projectId;
  if (attachmentURL) transactionData.attachmentURL = attachmentURL;
  if (referenceId) transactionData.referenceId = referenceId;
  if (paymentMethod) transactionData.paymentMethod = paymentMethod;
  if (bankAccountId) transactionData.bankAccountId = bankAccountId;
  if (salesRepId) transactionData.salesRepId = salesRepId;
  if (companyId) transactionData.companyId = companyId;

  try {
    await db.runTransaction(async (t) => {
      // If a bank account is involved and the status is approved, update its balance
      if (bankAccountId && status === 'approved') {
        const bankRef = db.collection('bankAccounts').doc(bankAccountId);
        const bankDoc = await t.get(bankRef);

        if (!bankDoc.exists) {
          throw new functions.https.HttpsError('not-found', 'الحساب البنكي غير موجود');
        }

        const currentBalance = bankDoc.data()?.balance || 0;
        let newBalance = currentBalance;

        if (type === 'expense' || type === 'purchase') {
          if (currentBalance < amount) {
            throw new functions.https.HttpsError('failed-precondition', 'الرصيد غير كافٍ لإتمام العملية');
          }
          newBalance = currentBalance - amount;
        } else if (type === 'income' || type === 'purchase_return') {
          newBalance = currentBalance + amount;
        }

        t.update(bankRef, {
          balance: newBalance,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      // Add the transaction record
      t.set(transactionRef, transactionData);
    });

    return { 
      success: true, 
      message: 'تم تسجيل المعاملة بنجاح', 
      transactionId: transactionRef.id 
    };

  } catch (error: any) {
    console.error('Error creating transaction:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'حدث خطأ أثناء معالجة المعاملة المالية');
  }
});

export const approveTransaction = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'يجب تسجيل الدخول');
  }

  const { transactionId } = data;
  if (!transactionId) {
    throw new functions.https.HttpsError('invalid-argument', 'رقم المعاملة مطلوب');
  }

  const db = admin.firestore();
  
  try {
    await db.runTransaction(async (t) => {
      const txRef = db.collection('transactions').doc(transactionId);
      const txDoc = await t.get(txRef);
      
      if (!txDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'المعاملة غير موجودة');
      }
      
      const txData = txDoc.data()!;
      if (txData.status === 'approved') {
        throw new functions.https.HttpsError('failed-precondition', 'المعاملة معتمدة مسبقاً');
      }

      // Deduct/Add from bank if bankAccountId is present
      if (txData.bankAccountId) {
        const bankRef = db.collection('bankAccounts').doc(txData.bankAccountId);
        const bankDoc = await t.get(bankRef);

        if (!bankDoc.exists) {
          throw new functions.https.HttpsError('not-found', 'الحساب البنكي غير موجود');
        }

        const currentBalance = bankDoc.data()?.balance || 0;
        let newBalance = currentBalance;
        const amount = Number(txData.amount) || 0;

        if (txData.type === 'expense' || txData.type === 'purchase') {
          if (currentBalance < amount) {
            throw new functions.https.HttpsError('failed-precondition', 'الرصيد غير كافٍ لإتمام العملية');
          }
          newBalance = currentBalance - amount;
        } else if (txData.type === 'income' || txData.type === 'purchase_return') {
          newBalance = currentBalance + amount;
        }

        t.update(bankRef, {
          balance: newBalance,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      t.update(txRef, {
        status: 'approved',
        approvedBy: context.auth!.uid,
        approvedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    return { success: true, message: 'تم الاعتماد بنجاح' };
  } catch (error: any) {
    console.error('Error approving transaction:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'حدث خطأ أثناء اعتماد المعاملة');
  }
});
