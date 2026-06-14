import { db } from './firebase';
import { collection, addDoc, getDocs, doc, deleteDoc, query, orderBy, serverTimestamp, getDoc } from 'firebase/firestore';

export type ReportType = 'projects' | 'financial' | 'employees' | 'clients' | 'purchases' | 'tasks' | 'attendance' | 'inventory' | 'assets' | 'invoices' | 'quotations' | 'workers' | 'payrolls' | 'subcontractors' | 'custom';

export interface SavedReport {
  id?: string;
  title: string;
  type: ReportType;
  dateRange: { start: string; end: string } | null;
  data: any; // JSON representation of the report
  summary?: any;
  createdAt: any;
  createdBy: string;
  filters?: Record<string, any>;
}

const COLLECTION_NAME = 'system_reports';

export const saveReport = async (reportData: Omit<SavedReport, 'id' | 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...reportData,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving report:', error);
    throw error;
  }
};

export const fetchReports = async (): Promise<SavedReport[]> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as SavedReport[];
  } catch (error) {
    console.error('Error fetching reports:', error);
    throw error;
  }
};

export const getReportById = async (id: string): Promise<SavedReport | null> => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as SavedReport;
        }
        return null;
    } catch (error) {
        console.error('Error fetching report by id:', error);
        throw error;
    }
}

export const deleteReport = async (id: string) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting report:', error);
    throw error;
  }
};
