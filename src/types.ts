export interface Client {
  id: string;
  fullName: string;
  sex: string;
  dob: string;
  age: number | null;
  ethnicity: string;
  countryOfBirth: string;
  languages: string[];
  referralSource: string;
  referringOrganisation?: string;
  referralDate: string;
  address?: string;
  postcode?: string;
  region?: string;
  password?: string;
  phoneNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  /** User ID of the staff member assigned to this client (from users table). */
  assignedStaffId?: string;
}

export interface HealthActivity {
    id: string;
    clientId: string;
    date: string;
    navigationAssistance: string[];
    servicesAccessed: string[];
    reasonForAssistance?: string;
    referralsMade: string;
    followUpActions: string;
    educationalResources: string[];
    preventiveServices: string[];
    maternalChildHealth: string[];
    // New fields for "Other" options
    otherAssistance?: string;
    otherEducation?: string;
    // Discharge information
    dischargeDate?: string;
    dischargeReason?: string;
    isDischarge?: boolean;
    // Staff tracking fields
    createdBy?: string; // Email of staff who created this
    createdByName?: string; // Name of staff who created this
    createdByRole?: 'admin' | 'coordinator' | 'navigator';
    createdAt?: string; // Timestamp when created
    location?: string; // Location where service was delivered
}

export interface Workforce {
  fte: number;
  role: string;
  ethnicity: string;
  languages: string[];
}

export interface WorkforceData {
  north: Workforce[];
  south: Workforce[];
}

export interface ProgramResource {
    id: string;
    name: string;
    type: string;
    dateAdded: string;
    category: string;
    // File storage fields
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    storagePath?: string;
}

export interface AiInsight {
    title: string;
    insight: string;
    recommendation?: string;
}

export interface GpPractice {
  id: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  notes: string;
}

export interface Attachment {
  name: string;
  type: string;
  data: string; // Base64 data URL
}

export interface ExperienceEntry {
  id: string;
  date: string;
  content: string;
  isRead?: boolean;
  attachments?: Attachment[];
}

export interface ChatMessage {
  id:string;
  timestamp: string;
  sender: 'patient' | 'navigator';
  text: string;
  language: string;
  isRead?: boolean;
}

export interface PatientData {
  experiences: ExperienceEntry[];
  messages: ChatMessage[];
}

export interface SurveyResponse {
  id: string;
  clientId: string;
  q1Rating: number; // Staff showed respect for how you were feeling
  q2Rating: number; // You had opportunities to discuss your support or care needs
  q3Rating: number; // Your culture, beliefs and values were respected
  submittedAt: string;
}

export interface CommunityEngagement {
  id: string;
  dateOfMeeting: string;
  agencyType: 'internal' | 'external';
  agencyName: string;
  staffPresent: string;
  meetingNotes: string;
  createdBy?: string;
  createdByName?: string;
  createdByRole?: 'admin' | 'coordinator' | 'navigator';
  createdAt?: string;
}

export type UserRole = 'admin' | 'coordinator' | 'navigator';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  assignedLocations: string[];
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  twoFactorEnabled?: boolean;
  phoneNumber?: string;
}

export interface UserActivity {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  action: string;
  details?: string;
  location?: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}