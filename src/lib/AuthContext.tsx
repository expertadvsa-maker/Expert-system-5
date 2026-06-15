import * as React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut, getRedirectResult } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, onSnapshot, documentId } from 'firebase/firestore';
import { auth, db } from './firebase';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from './firestore-errors';
import { UserProfile, Company } from '../types';
import { fetchAliphiaClients } from './aliphia';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  activeCompanyId: string | null;
  setActiveCompanyId: (id: string) => void;
  companies: Company[];
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  profile: null, 
  loading: true, 
  activeCompanyId: null, 
  setActiveCompanyId: () => {}, 
  companies: [] 
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(localStorage.getItem('activeCompanyId'));
  const [companies, setCompanies] = useState<Company[]>([]);

  const setActiveCompanyId = (id: string) => {
    setActiveCompanyIdState(id);
    localStorage.setItem('activeCompanyId', id);
  };

  useEffect(() => {
    // Handle redirect result to catch errors during redirect login
    getRedirectResult(auth).catch((error) => {
      console.error("Redirect login error:", error);
      toast.error(error.message || 'فشل تسجيل الدخول عبر التحويل');
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user && user.email) {
        try {
          const userEmail = user.email.toLowerCase().trim();
          
          // Deduplicate and heal users under the same email automatically
          const qAll = query(collection(db, 'users'), where('email', '==', userEmail));
          let snapEmailAll;
          try {
            snapEmailAll = await getDocs(qAll);
          } catch (error) {
            handleFirestoreError(error, OperationType.GET, 'users', auth);
            setLoading(false);
            return;
          }

          let finalProfile: UserProfile | null = null;
          
          if (!snapEmailAll.empty) {
            if (snapEmailAll.size > 1) {
              console.log(`Found ${snapEmailAll.size} duplicate documents for email: ${userEmail}. Merging...`);
              
              // Define role priorities to choose the primary profile role
              const rolePriority = {
                'manager': 5,
                'supervisor': 4,
                'employee': 3,
                'worker': 2,
                'sales_rep': 1
              };
              
              const docsList = snapEmailAll.docs;
              
              // 1. Identify primary document: prefer already linked UID, or higher priority role
              let primaryDoc = docsList.find(d => d.data().uid === user.uid);
              if (!primaryDoc) {
                primaryDoc = [...docsList].sort((a, b) => {
                  const roleA = a.data().role || 'employee';
                  const roleB = b.data().role || 'employee';
                  const priorityA = (rolePriority as any)[roleA] || 0;
                  const priorityB = (rolePriority as any)[roleB] || 0;
                  return priorityB - priorityA;
                })[0];
              }
              
              // 2. Merge properties from all duplicate records
              const mergedData = { ...primaryDoc.data() };
              
              for (const otherDoc of docsList) {
                if (otherDoc.id !== primaryDoc.id) {
                  const otherData = otherDoc.data();
                  
                  // Copy Sales Rep fields if present
                  if (otherData.compensationType) mergedData.compensationType = otherData.compensationType;
                  if (otherData.commissionRate !== undefined) mergedData.commissionRate = otherData.commissionRate;
                  if (otherData.baseSalary !== undefined) mergedData.baseSalary = otherData.baseSalary;
                  if (otherData.blockQuotations !== undefined) mergedData.blockQuotations = otherData.blockQuotations;
                  if (otherData.blockInvoices !== undefined) mergedData.blockInvoices = otherData.blockInvoices;
                  
                  // Copy employee fields if primary is missing them
                  if (!mergedData.phone && otherData.phone) mergedData.phone = otherData.phone;
                  if (!mergedData.nationality && otherData.nationality) mergedData.nationality = otherData.nationality;
                  if (!mergedData.iqamaNumber && otherData.iqamaNumber) mergedData.iqamaNumber = otherData.iqamaNumber;
                  if (!mergedData.iqamaExpiry && otherData.iqamaExpiry) mergedData.iqamaExpiry = otherData.iqamaExpiry;
                  if (!mergedData.department && otherData.department) mergedData.department = otherData.department;
                  if (!mergedData.dept && otherData.dept) mergedData.dept = otherData.dept;
                  if (!mergedData.salary && otherData.salary) mergedData.salary = otherData.salary;
                  
                  // Delete duplicate document to clean up DB
                  try {
                    await deleteDoc(doc(db, 'users', otherDoc.id));
                    console.log(`Deleted duplicate user doc: ${otherDoc.id}`);
                  } catch (delErr) {
                    console.error("Error deleting duplicate doc:", delErr);
                  }
                }
              }
              
              // 3. Set UID and ensure role is clean
              mergedData.uid = user.uid;
              if (!mergedData.role) mergedData.role = 'employee';
              
              try {
                await updateDoc(doc(db, 'users', primaryDoc.id), mergedData);
                console.log(`Successfully merged duplicates into document: ${primaryDoc.id}`);
              } catch (updErr) {
                console.error("Error updating primary merged doc:", updErr);
              }
              
              finalProfile = {
                id: primaryDoc.id,
                ...mergedData,
                uid: user.uid
              } as UserProfile;
              
            } else {
              // Exactly 1 document exists
              const userDoc = snapEmailAll.docs[0];
              const userData = userDoc.data();
              
              if (userData.uid !== user.uid) {
                try {
                  await updateDoc(doc(db, 'users', userDoc.id), { uid: user.uid });
                  console.log("Auto-linked UID to unique profile document");
                } catch (linkErr) {
                  console.warn("Could not auto-link UID", linkErr);
                }
              }
              
              finalProfile = {
                id: userDoc.id,
                ...userData,
                uid: user.uid
              } as UserProfile;
            }
            
            // Enforce that ONLY expertadvsa@gmail.com can hold 'manager' role
            if (finalProfile && finalProfile.role === 'manager' && userEmail !== 'expertadvsa@gmail.com') {
              finalProfile.role = 'supervisor'; // Automatically downgrade non-owners to supervisor for safety
            }
            if (userEmail === 'expertadvsa@gmail.com') {
              finalProfile.role = 'owner';
            }
            
            setProfile(finalProfile);
            setUser(user);
          } else {
            // No registered account in users collection
            
            // Check if they are an Aliphia client
            let isClient = false;
            try {
              const clients = await fetchAliphiaClients();
              const matchedClient = clients.find((c: any) => c.email && c.email.toLowerCase().trim() === userEmail);
              if (matchedClient) {
                isClient = true;
                const clientProfile: UserProfile = {
                  id: 'client_' + matchedClient.id,
                  uid: user.uid,
                  name: matchedClient.name,
                  email: userEmail,
                  role: 'client' as any, // Cast as 'client' is an expected role
                  phone: matchedClient.phone
                };
                setProfile(clientProfile);
                setUser(user);
              }
            } catch (clientErr) {
              console.error("Error checking Aliphia clients:", clientErr);
            }

            if (!isClient) {
              // Check fallback for designated system managers/owners - strictly the owner only
              if (userEmail === 'expertadvsa@gmail.com') {
                const adminProfile: UserProfile = {
                  id: 'system_admin_' + user.uid,
                  uid: user.uid,
                  name: user.displayName || 'المالك والمدير العام',
                  email: userEmail,
                  role: 'manager',
                };
                setProfile(adminProfile);
                setUser(user);
              } else {
                await signOut(auth);
                setUser(null);
                setProfile(null);
                toast.error('عذراً، هذا البريد الإلكتروني غير مسجل في النظام. يرجى التواصل مع المالك لإضافتك أولاً.');
              }
            }
          }
        } catch (error) {
          console.error("Auth System Error:", error);
          if (!(error instanceof Error && error.message.startsWith('{'))) {
            await signOut(auth);
            setUser(null);
            setProfile(null);
            toast.error('حدث خطأ أثناء التحقق من صلاحيات الدخول.');
          }
        }
      } else if (user && !user.email) {
          await signOut(auth);
          toast.error('يجب توفر بريد إلكتروني للدخول');
      } else {
        setUser(null);
        setProfile(null);
        setCompanies([]);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!profile) return;
    
    // Fetch companies that this user has access to
    let qCompanies;
    if (profile.role === 'owner') {
      qCompanies = query(collection(db, 'companies'));
    } else {
      const allowedIds = profile.ownedCompanies || (profile.companyId ? [profile.companyId] : []);
      if (allowedIds.length === 0) {
        setCompanies([]);
        return;
      }
      
      // Firebase 'in' queries have a limit of 10. Split into chunks if needed.
      const chunks = [];
      for (let i = 0; i < allowedIds.length; i += 10) {
        chunks.push(allowedIds.slice(i, i + 10));
      }
      
      qCompanies = query(collection(db, 'companies'), where(documentId(), 'in', chunks[0]));
    }
      
    const unsubscribeCompanies = onSnapshot(qCompanies, (snap) => {
      const fetchedCompanies = snap.docs.map(d => ({ id: d.id, ...d.data() } as Company));
      setCompanies(fetchedCompanies);
      
      // Auto-select company if none is selected
      if (fetchedCompanies.length > 0 && (!activeCompanyId || !fetchedCompanies.find(c => c.id === activeCompanyId))) {
        setActiveCompanyId(fetchedCompanies[0].id);
      }
    }, (err) => {
      console.error("Error fetching companies:", err);
    });

    return unsubscribeCompanies;
  }, [profile]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, activeCompanyId, setActiveCompanyId, companies }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
