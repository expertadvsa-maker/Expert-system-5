// Common interfaces for the application
export type UserRole = 'owner' | 'manager' | 'supervisor' | 'employee' | 'worker' | 'sales_rep';

export interface Company {
  id: string;
  name: string;
  logoUrl?: string;
  taxNumber?: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  ownerId: string;
  createdAt: any;
  settings?: any;
}

export interface UserProfile {
  id: string;
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  dept?: string;
  photoURL?: string;
  salary?: number;
  iqamaNumber?: string;
  iqamaExpiry?: string;
  phone?: string;
  nationality?: string;
  joinedAt?: string;
  // Sales Rep specific fields
  compensationType?: 'salary' | 'commission_only';
  commissionRate?: number;
  baseSalary?: number;
  blockQuotations?: boolean;
  blockInvoices?: boolean;
  companyId?: string; // Multi-tenant
  ownedCompanies?: string[]; // Array of company IDs they own/have access to
}

export interface ProjectMilestone {
  title: string;
  description?: string;
  weight?: number; // Weight percentage for progress calculation
  status: 'pending' | 'in-progress' | 'completed' | 'review-requested';
  date: string;
  dueDate?: string;
  assignedWorkerId?: string;
  verification?: {
    status: 'pending' | 'approved' | 'rejected';
    verifiedBy?: string;
    verifiedAt?: string;
    complianceScore?: number;
    qcNotes?: string;
    materialsApproved?: boolean;
    dimensionsChecked?: boolean;
  };
}

export interface ProjectUpdate {
  id: string;
  projectId: string;
  content: string;
  authorId: string;
  authorName: string;
  type: 'general' | 'incident' | 'progress' | 'photo';
  mediaUrls?: string[];
  createdAt: string;
}

export interface PaymentInstallment {
  id: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
  description?: string;
  paidAt?: string;
}

export interface MaterialEstimateItem {
  name: string;
  qty: number;
  unit: string;
  purpose: string;
  wastagePercent?: number;
}

export interface EngineeringGap {
  severity: 'critical' | 'warning';
  field: string;
  issue: string;
  recommendation: string;
  fallbackValue: any;
}

export interface Project {
  id: string;
  title: string;
  name?: string; // Compatibility
  description?: string;
  status: 'planning' | 'active' | 'completed' | 'on-hold' | 'in-progress' | 'handover_pending' | 'maintenance' | 'closed' | 'cancelled';
  locationLink?: string;
  locationCoords?: { lat: number, lng: number };
  clientName?: string;
  clientPhone?: string;
  clientPin?: string; // Secure PIN for client access
  isClientNotified?: boolean;
  handoverAccepted?: boolean;
  handoverDate?: string;
  handoverSignatureText?: string;
  handoverClientSignature?: string; // Ticked or signed by client
  handoverClientDate?: string;
  clientRating?: number;
  warrantyContractUrl?: string;
  warrantyEndDate?: string;
  startDate?: string;
  endDate?: string;
  deliveryDate?: string;
  budget?: number;
  projectValue?: number;
  depositAmount?: number;
  depositStatus?: 'pending' | 'paid';
  photoUrls?: string[];
  videoUrls?: string[];
  workerIds?: string[];
  subcontractorIds?: string[];
  milestones?: ProjectMilestone[];
  payments?: PaymentInstallment[];
  createdAt: string;
  assignedEmployees?: string[]; // Smart Zones specific employees
  approvalDate?: string;
  projectType?: string;
  supervisor?: string;
  contractNumber?: string;
  engOffice?: string;
  totalArea?: string;
  projectStatus?: string;
  progress?: number;
  clientEmail?: string;
  timestamp?: any;
  fileAttachments?: { name: string; url: string; uploadedAt?: string }[];
  companyId?: string;
  materialEstimates?: MaterialEstimateItem[];
  safetyGaps?: EngineeringGap[];
  gapAnalysisApproved?: boolean;
  installationHeightMeters?: number;
  requiredEquipment?: string[];
  highwaySpeedRisk?: boolean;
  visualLocationAnalysis?: {
    estimatedFloors?: number;
    risksDetected?: string[];
    equipmentReasoning?: string;
  };
  historicalPrecedent?: {
    similarProjectTitle?: string;
    similarityReasoning?: string;
    lessonsLearned?: string[];
  };
  municipalityCompliance?: {
    isCompliant?: boolean;
    municipalityName?: string;
    regulationsApplicable?: string[];
    violationsDetected?: string[];
    remedialActions?: string[];
  };
}

export interface MaintenanceRequest {
  id: string;
  projectId: string;
  date: string;
  description: string;
  title?: string;
  status: 'pending' | 'in-progress' | 'completed';
  reportedBy: 'client' | 'staff';
  workerId?: string;
  attachments?: string[];
  resolutionNotes?: string;
  resolvedAt?: string;
}

export interface ProjectNote {
  id: string;
  projectId: string;
  content: string;
  date: string;
  createdBy: string;
  userName: string;
}

export interface Subcontractor {
  id: string;
  projectId: string;
  name: string;
  serviceType: string;
  contractAmount: number;
  paidAmount: number;
  contact: string;
  status: 'active' | 'completed';
}

export interface DailyLog {
  id: string;
  projectId: string;
  amountEarned: number;
  date: string;
  description: string;
  workerId?: string;
  workerName?: string;
}

export interface BankAccount {
  id: string;
  name: string;
  accountNumber?: string;
  iban?: string;
  ibanCertificateUrl?: string;
  type: 'bank' | 'cash';
  initialBalance: number;
  status: 'active' | 'suspended';
  bankName?: string;
  lastUpdated?: any;
  companyId?: string;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  date: any; // Can be string or Timestamp
  createdBy: string;
  projectId?: string;
  attachmentURL?: string;
  status?: 'pending' | 'approved' | 'rejected';
  referenceId?: string;
  paymentMethod?: 'cash' | 'transfer';
  bankAccountId?: string;
  salesRepId?: string;
  companyId?: string;
}

export interface Attendance {
  id: string;
  userId: string;
  userName: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  location?: string;
  status: 'present' | 'absent' | 'leave';
  companyId?: string;
}

export interface SystemSettings {
  companyName: string;
  companySub: string;
  attendanceRadius: number;
  workingHoursStart: string;
  workingHoursEnd: string;
  allowManualAttendance: boolean;
  companyId?: string;
}

export interface Quotation {
  id: string;
  salesRepId: string;
  salesRepName: string;
  clientName: string;
  totalAmount: number;
  items: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  docNumber?: string;
  pdfUrl?: string;
  aliphiaId?: string;
  docType?: 'quotation' | 'invoice';
  projectId?: string;
  projectName?: string;
  itemsDetail?: Array<{
    name: string;
    qty: number;
    price: number;
    desc?: string;
  }>;
  clientId?: string;
  notes?: string;
}
