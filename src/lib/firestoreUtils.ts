import { collection, query as firestoreQuery, where, addDoc } from 'firebase/firestore';
import { db } from './firebase';

export const getCompanyQuery = (path: string, activeCompanyId?: string | null) => {
  if (activeCompanyId) {
    return firestoreQuery(collection(db, path), where('companyId', '==', activeCompanyId));
  }
  return collection(db, path);
};

export const addCompanyDoc = async (path: string, data: any, activeCompanyId?: string | null) => {
  return addDoc(collection(db, path), {
    ...data,
    companyId: activeCompanyId || null,
    createdAt: data.createdAt || new Date().toISOString()
  });
};
