import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Client, HealthActivity, WorkforceData, ProgramResource, GpPractice, PatientData } from './types';
import { clientService, activityService, workforceService, resourceService, gpPracticeService, patientDataService } from './services/supabaseService';
import ClientDemographics from './components/ClientDemographics';
import HealthNavigationActivities from './components/HealthNavigationActivities';
import WorkforceTracking from './components/WorkforceTracking';
import ProgramResources from './components/ProgramResources';
import AiInsightsDashboard from './components/AiInsightsDashboard';
import Dashboard from './components/Dashboard';
import SimpleAuthPage from './components/SimpleAuthPage';
import GpEngagement from './components/GpEngagement';
import LocalDemographics from './components/LocalDemographics';
import MyNavigation from './components/MyNavigation';
import PatientSubmissionsViewer from './components/PatientSubmissionsViewer';
import ProgramReporting from './components/ProgramReporting';
import UnifiedReporting from './components/UnifiedReporting';
import UserManagement from './components/UserManagement';
import StaffPerformance from './components/StaffPerformance';
import { userService } from './services/supabaseService';
import type { User } from './types';
import { Leaf, Users, HeartPulse, FolderKanban, BotMessageSquare, Sun, Moon, Menu, LayoutDashboard, Briefcase, LogOut, Stethoscope, Map, FilePieChart, FileBarChart, UserCog, BarChart3 } from 'lucide-react';

const App: React.FC = () => {
  // Staff-side data
  const [clients, setClients] = useState<Client[]>([]);
  const [activities, setActivities] = useState<HealthActivity[]>([]);
  const [workforce, setWorkforce] = useState<WorkforceData>({ north: [], south: [] });
  const [resources, setResources] = useState<ProgramResource[]>([]);
  const [gpPractices, setGpPractices] = useState<GpPractice[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // Patient-side data, keyed by client ID
  const [patientData, setPatientData] = useState<Record<string, PatientData>>({});
  
  const [session, setSession] = useState<{ role: 'staff' | 'patient', user?: Client, userRole?: 'admin' | 'coordinator' | 'navigator', userEmail?: string } | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSubmissionsModalOpen, setIsSubmissionsModalOpen] = useState(false);
  
  const isInitialDataLoaded = useRef(false);

  useEffect(() => {
    // Check for saved dark mode preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDarkMode(false);
    }
    
    // Check for saved session
    const savedSession = localStorage.getItem('session');
    if (savedSession) {
      setSession(JSON.parse(savedSession));
    }
  }, []);

  useEffect(() => {
    // Load data from database
    const loadData = async () => {
      if (isInitialDataLoaded.current) return;
      
      try {
        // Try to load from database first
        const [dbClients, dbActivities, dbWorkforce, dbResources, dbGpPractices, dbUsers] = await Promise.all([
          clientService.getAll(),
          activityService.getAll(),
          workforceService.getAll(),
          resourceService.getAll(),
          gpPracticeService.getAll(),
          userService.getAll()
        ]);

        if (dbClients.length > 0) {
          setClients(dbClients);
        } else {
          // Use mock data if database is empty
        const mockClients: Client[] = [
            { id: 'C4F2A1', fullName: 'John Doe', sex: 'Male', dob: '1985-05-15', age: 39, ethnicity: 'Chinese', countryOfBirth: 'China', languages: ['Mandarin', 'English'], referralSource: 'GP', referralDate: '2024-04-10', password: 'pass123' },
            { id: 'C8B9D3', fullName: 'Jane Smith', sex: 'Female', dob: '1992-08-22', age: 31, ethnicity: 'Afghan', countryOfBirth: 'Afghanistan', languages: ['Dari', 'English'], referralSource: 'Community Org', referralDate: '2024-05-01', password: 'pass123' },
            { id: 'C1E0F5', fullName: 'Abioye Abebe', sex: 'Male', dob: '1995-02-10', age: 29, ethnicity: 'Sudanese', countryOfBirth: 'Sudan', languages: ['Arabic', 'English'], referralSource: 'Hospital', referralDate: '2024-03-15', password: 'pass123' },
            { id: 'C7A6B8', fullName: 'Lien Nguyen', sex: 'Female', dob: '1978-11-30', age: 45, ethnicity: 'Vietnamese', countryOfBirth: 'Vietnam', languages: ['Vietnamese'], referralSource: 'GP', referralDate: '2024-04-20', password: 'pass123' },
            { id: 'C2D3E4', fullName: 'Fatima Al-Jamil', sex: 'Female', dob: '2001-07-19', age: 22, ethnicity: 'Syrian', countryOfBirth: 'Syria', languages: ['Arabic'], referralSource: 'Self', referralDate: '2024-05-12', password: 'pass123' },
            { id: 'C9F8A7', fullName: 'Chen Wei', sex: 'Male', dob: '1998-01-05', age: 26, ethnicity: 'Chinese', countryOfBirth: 'China', languages: ['Mandarin'], referralSource: 'Community Org', referralDate: '2024-02-28', password: 'pass123' },
            { id: 'C6B5C4', fullName: 'Asha Sharma', sex: 'Female', dob: '1989-09-03', age: 34, ethnicity: 'Indian', countryOfBirth: 'India', languages: ['Hindi', 'English'], referralSource: 'Family/Friend', referralDate: '2024-06-01', password: 'pass123' },
            { id: 'C3D2E1', fullName: 'David Okoro', sex: 'Male', dob: '1993-04-25', age: 31, ethnicity: 'Nigerian', countryOfBirth: 'Nigeria', languages: ['English'], referralSource: 'GP', referralDate: '2024-05-18', password: 'pass123' },
            { id: 'C0F9E8', fullName: 'Sofia Rossi', sex: 'Female', dob: '1965-12-12', age: 58, ethnicity: 'Italian', countryOfBirth: 'Italy', languages: ['Italian', 'English'], referralSource: 'Hospital', referralDate: '2024-01-22', password: 'pass123' },
            { id: 'C5A4B3', fullName: 'Jamal Hussein', sex: 'Male', dob: '1990-06-08', age: 34, ethnicity: 'Somali', countryOfBirth: 'Somalia', languages: ['Somali', 'English'], referralSource: 'NGO', referralDate: '2024-03-05', password: 'pass123' }
        ];
        setClients(mockClients);
        }
        
        if (dbActivities.length > 0) {
          setActivities(dbActivities);
        } else {
          // Use mock activities if database is empty
        const mockActivities: HealthActivity[] = [
            // Navigator activities
            { id: 'a1', clientId: 'C4F2A1', date: '2024-05-20', navigationAssistance: ['Appointment Scheduling'], servicesAccessed: ['GP / Primary Care', 'Specialists'], referralsMade: 'Referred to cardiologist', followUpActions: 'Booked follow-up appointment', educationalResources: ['Cardiovascular health / Hypertension'], preventiveServices: [], maternalChildHealth: [], createdBy: 'navigator@multinav.com', createdByName: 'Health Navigator', createdByRole: 'navigator', location: 'Stirling' },
            { id: 'a2', clientId: 'C8B9D3', date: '2024-05-22', navigationAssistance: ['Interpreter Support', 'Care Coordination'], servicesAccessed: ['Mental Health', 'GP / Primary Care'], referralsMade: 'Referred to psychologist', followUpActions: 'Scheduled weekly sessions', educationalResources: ['Mental health support services'], preventiveServices: [], maternalChildHealth: [], createdBy: 'navigator@multinav.com', createdByName: 'Health Navigator', createdByRole: 'navigator', location: 'Stirling' },
            { id: 'a3', clientId: 'C1E0F5', date: '2024-04-01', navigationAssistance: ['Medicare Enrollment'], servicesAccessed: ['GP / Primary Care'], referralsMade: 'N/A', followUpActions: 'Client successfully enrolled in Medicare.', educationalResources: [], preventiveServices: ['Immunisation'], maternalChildHealth: [], createdBy: 'navigator@multinav.com', createdByName: 'Health Navigator', createdByRole: 'navigator', location: 'Stirling' },
            // Coordinator activities
            { id: 'a4', clientId: 'C7A6B8', date: '2024-04-25', navigationAssistance: ['Appointment Scheduling', 'Interpreter Support'], servicesAccessed: ['Dental'], referralsMade: 'Referred to public dental clinic', followUpActions: 'Awaiting appointment confirmation', educationalResources: [], preventiveServices: [], maternalChildHealth: [], createdBy: 'coordinator@multinav.com', createdByName: 'Program Coordinator', createdByRole: 'coordinator', location: 'Canning' },
            { id: 'a5', clientId: 'C2D3E4', date: '2024-05-15', navigationAssistance: ['Care Coordination'], servicesAccessed: ['Maternal / Child Health Services', 'GP / Primary Care'], referralsMade: 'N/A', followUpActions: 'Connected with local MCH nurse.', educationalResources: [], preventiveServices: [], maternalChildHealth: ['Prenatal / Pregnancy Services', 'Infant / Child Health Checks'], createdBy: 'coordinator@multinav.com', createdByName: 'Program Coordinator', createdByRole: 'coordinator', location: 'Gosnells' },
            // More navigator activities spread across different locations
            { id: 'a6', clientId: 'C9F8A7', date: '2024-03-10', navigationAssistance: ['Transport Assistance'], servicesAccessed: ['Specialists', 'Diagnostic Tests'], referralsMade: 'N/A', followUpActions: 'Arranged transport for MRI scan.', educationalResources: [], preventiveServices: [], maternalChildHealth: [], createdBy: 'navigator@multinav.com', createdByName: 'Health Navigator', createdByRole: 'navigator', location: 'Swan' },
            { id: 'a7', clientId: 'C6B5C4', date: '2024-06-05', navigationAssistance: ['Appointment Scheduling'], servicesAccessed: ['GP / Primary Care'], referralsMade: 'N/A', followUpActions: 'General check-up booked.', educationalResources: ['Diabetes prevention and management'], preventiveServices: ['Bowel Screening'], maternalChildHealth: [], createdBy: 'navigator@multinav.com', createdByName: 'Health Navigator', createdByRole: 'navigator', location: 'Wanneroo' },
            // More coordinator activities
            { id: 'a8', clientId: 'C3D2E1', date: '2024-05-28', navigationAssistance: ['Patient Rights and Responsibilities'], servicesAccessed: ['GP / Primary Care'], referralsMade: 'N/A', followUpActions: 'Provided information on patient advocacy.', educationalResources: [], preventiveServices: [], maternalChildHealth: [], createdBy: 'coordinator@multinav.com', createdByName: 'Program Coordinator', createdByRole: 'coordinator', location: 'Mandurah' },
            { id: 'a9', clientId: 'C0F9E8', date: '2024-02-15', navigationAssistance: ['Care Coordination'], servicesAccessed: ['Specialists'], referralsMade: 'Follow up with geriatrician', followUpActions: 'Coordinated with family for support.', educationalResources: ['Medication adherence and safety'], preventiveServices: [], maternalChildHealth: [], createdBy: 'coordinator@multinav.com', createdByName: 'Program Coordinator', createdByRole: 'coordinator', location: 'Canning' },
            // Admin activities (for testing/demo)
            { id: 'a10', clientId: 'C5A4B3', date: '2024-03-20', navigationAssistance: ['Interpreter Support'], servicesAccessed: ['Mental Health'], referralsMade: 'N/A', followUpActions: 'Attended session with interpreter.', educationalResources: ['Mental health support services'], preventiveServices: [], maternalChildHealth: [], createdBy: 'admin@multinav.com', createdByName: 'System Administrator', createdByRole: 'admin', location: 'Stirling' },
            // More activities distributed among staff
            { id: 'a11', clientId: 'C4F2A1', date: '2024-06-10', navigationAssistance: ['Care Coordination'], servicesAccessed: ['Diagnostic Tests'], referralsMade: 'N/A', followUpActions: 'Followed up on test results.', educationalResources: [], preventiveServices: [], maternalChildHealth: [], createdBy: 'navigator@multinav.com', createdByName: 'Health Navigator', createdByRole: 'navigator', location: 'Canning' },
            { id: 'a12', clientId: 'C1E0F5', date: '2024-05-05', navigationAssistance: ['Appointment Scheduling'], servicesAccessed: ['GP / Primary Care'], referralsMade: 'N/A', followUpActions: 'Booked annual physical.', educationalResources: [], preventiveServices: ['Immunisation'], maternalChildHealth: [], createdBy: 'navigator@multinav.com', createdByName: 'Health Navigator', createdByRole: 'navigator', location: 'Gosnells' },
            { id: 'a13', clientId: 'C2D3E4', date: '2024-06-02', navigationAssistance: ['Interpreter Support'], servicesAccessed: ['Maternal / Child Health Services'], referralsMade: 'N/A', followUpActions: 'Scheduled 6-week post-natal check.', educationalResources: [], preventiveServices: [], maternalChildHealth: ['Breastfeeding Support'], createdBy: 'coordinator@multinav.com', createdByName: 'Program Coordinator', createdByRole: 'coordinator', location: 'Stirling' },
            { id: 'a14', clientId: 'C6B5C4', date: '2024-06-11', navigationAssistance: ['Care Coordination'], servicesAccessed: ['Specialists'], referralsMade: 'Referred to endocrinologist', followUpActions: 'Appointment made for July.', educationalResources: ['Diabetes prevention and management'], preventiveServices: [], maternalChildHealth: [], createdBy: 'coordinator@multinav.com', createdByName: 'Program Coordinator', createdByRole: 'coordinator', location: 'Swan' },
            { id: 'a15', clientId: 'C8B9D3', date: '2024-06-15', navigationAssistance: ['Appointment Scheduling'], servicesAccessed: ['Mental Health'], referralsMade: 'N/A', followUpActions: 'Booked next therapy session.', educationalResources: [], preventiveServices: [], maternalChildHealth: [], createdBy: 'navigator@multinav.com', createdByName: 'Health Navigator', createdByRole: 'navigator', location: 'Wanneroo' }
        ];
        setActivities(mockActivities);
        }
        
        // Load workforce data
        if (Object.keys(dbWorkforce).length > 0) {
          setWorkforce(dbWorkforce);
        } else {
        const mockWorkforce: WorkforceData = {
            north: [
                { fte: 1, role: 'CaLD Health Navigator', ethnicity: 'Vietnamese', languages: ['Vietnamese', 'English'] },
                { fte: 0.8, role: 'CaLD Health Navigator', ethnicity: 'Chinese', languages: ['Mandarin', 'Cantonese', 'English'] },
                { fte: 1, role: 'Team Lead', ethnicity: 'Australian', languages: ['English'] }
            ],
            south: [
                { fte: 1, role: 'Senior Health Navigator', ethnicity: 'Sudanese', languages: ['Arabic', 'English'] },
                { fte: 1, role: 'CaLD Health Navigator', ethnicity: 'Somali', languages: ['Somali', 'English'] },
                { fte: 0.6, role: 'CaLD Health Navigator', ethnicity: 'Afghan', languages: ['Dari', 'Farsi', 'English'] }
            ],
        };
        setWorkforce(mockWorkforce);
        }

        // Load resources data
        if (dbResources.length > 0) {
          setResources(dbResources);
        } else {
        const mockResources: ProgramResource[] = [
           { id: 'r1', name: 'Annual Action Plan 2024.docx', type: 'DOCX', dateAdded: '2024-03-01T10:00:00Z', category: 'Program Work/Action Plan' },
           { id: 'r2', name: 'Client Confidentiality Policy.pdf', type: 'PDF', dateAdded: '2024-03-05T11:30:00Z', category: 'Policies & Procedures' },
           { id: 'r3', name: 'MOU with Community Hospital.pdf', type: 'PDF', dateAdded: '2024-04-12T15:00:00Z', category: 'Governance - Pathway Agreement i.e. MOUs and SLAs' },
           { id: 'r4', name: 'Data Privacy and Security Policy.pdf', type: 'PDF', dateAdded: '2024-04-15T09:00:00Z', category: 'Policies & Procedures' },
           { id: 'r5', name: 'Service Level Agreement - Translation Services.docx', type: 'DOCX', dateAdded: '2024-05-20T14:00:00Z', category: 'Governance - Pathway Agreement i.e. MOUs and SLAs' },
        ];
        setResources(mockResources);
        }

        // Load GP practices data
        if (dbGpPractices.length > 0) {
          setGpPractices(dbGpPractices);
        } else {
        const mockGpPractices: GpPractice[] = [
            { id: 'gp1', name: 'Mirrabooka General Practice', address: '5/81 Honeywell Blvd, Mirrabooka WA 6061', phone: '(08) 9344 4544', website: 'https://www.mirrabookagp.com.au/', notes: 'Known for multilingual staff, including Arabic and Burmese speakers. Bulk billing available.' },
            { id: 'gp2', name: 'DR K. Rasaratnam & Associates', address: '232 Warwick Rd, Duncraig WA 6023', phone: '(08) 9447 5115', website: 'http://www.drkrasa.com.au/', notes: 'Focus on family health and chronic disease management. Works with TIS for interpreters.' },
            { id: 'gp3', name: 'Jupiter Health & Medical Services - Cannington', address: '1490 Albany Hwy, Beckenham WA 6107', phone: '(08) 9258 5444', website: 'https://www.jupiterhealthservices.com.au/clinics/cannington', notes: 'Large clinic with diverse GPs. Good accessibility for southern suburbs. Direct access to pathology.' }
        ];
        setGpPractices(mockGpPractices);
        }
        
        // Load patient data from database
        try {
          const dbPatientData = await patientDataService.getAllPatientData();
          if (Object.keys(dbPatientData).length > 0) {
            console.log('[App] Loaded patient data from database:', Object.keys(dbPatientData).length, 'clients');
            setPatientData(dbPatientData);
          } else {
            // Use mock data if database is empty
            console.log('[App] No patient data in database, using mock data');
            const mockPatientData: Record<string, PatientData> = {
                'C4F2A1': {
                    experiences: [{ id: 'e1', date: '2024-05-18', content: 'The specialist was hard to understand, but the navigator helped me a lot by booking an interpreter.', isRead: true, attachments: [] }],
                    messages: [
                        { id: 'm1', timestamp: '2024-06-10T10:00:00Z', sender: 'patient', text: '你好，我需要帮助预约我的下一次心脏病专家门诊。', language: 'Mandarin', isRead: false },
                        { id: 'm2', timestamp: '2024-06-10T10:05:00Z', sender: 'navigator', text: "Of course, John. I will check the cardiologist's availability and book that for you. I will confirm by this afternoon.", language: 'English', isRead: true }
                    ],
                },
                'C8B9D3': {
                    experiences: [],
                    messages: [],
                },
                 'C2D3E4': {
                    experiences: [{ id: 'e2', date: '2024-06-15', content: 'The maternal health nurse was very kind. I feel much more confident now.', isRead: false, attachments: [] }],
                    messages: [],
                }
            };
            setPatientData(mockPatientData);
          }
        } catch (error) {
          console.error('[App] Error loading patient data:', error);
          // Fallback to mock data
          const mockPatientData: Record<string, PatientData> = {
              'C4F2A1': {
                  experiences: [{ id: 'e1', date: '2024-05-18', content: 'The specialist was hard to understand, but the navigator helped me a lot by booking an interpreter.', isRead: true, attachments: [] }],
                  messages: [
                      { id: 'm1', timestamp: '2024-06-10T10:00:00Z', sender: 'patient', text: '你好，我需要帮助预约我的下一次心脏病专家门诊。', language: 'Mandarin', isRead: false },
                      { id: 'm2', timestamp: '2024-06-10T10:05:00Z', sender: 'navigator', text: "Of course, John. I will check the cardiologist's availability and book that for you. I will confirm by this afternoon.", language: 'English', isRead: true }
                  ],
              },
              'C8B9D3': {
                  experiences: [],
                  messages: [],
              },
               'C2D3E4': {
                  experiences: [{ id: 'e2', date: '2024-06-15', content: 'The maternal health nurse was very kind. I feel much more confident now.', isRead: false, attachments: [] }],
                  messages: [],
              }
          };
          setPatientData(mockPatientData);
        }

        // Load users or use mock users
        if (dbUsers && dbUsers.length > 0) {
          setUsers(dbUsers);
        } else {
          // Mock users for demo
          const mockUsers: User[] = [
            {
              id: 'USR001',
              email: 'admin@multinav.com',
              fullName: 'System Administrator',
              role: 'admin',
              assignedLocations: ['Canning', 'Gosnells', 'Mandurah', 'Stirling', 'Swan', 'Wanneroo'],
              isActive: true,
              createdAt: '2024-01-01T00:00:00Z',
              twoFactorEnabled: false
            },
            {
              id: 'USR002',
              email: 'coordinator@multinav.com',
              fullName: 'Program Coordinator',
              role: 'coordinator',
              assignedLocations: ['Canning', 'Gosnells'],
              isActive: true,
              createdAt: '2024-01-01T00:00:00Z',
              twoFactorEnabled: false
            },
            {
              id: 'USR003',
              email: 'navigator@multinav.com',
              fullName: 'Health Navigator',
              role: 'navigator',
              assignedLocations: ['Stirling'],
              isActive: true,
              createdAt: '2024-01-01T00:00:00Z',
              twoFactorEnabled: false
            },
            {
              id: 'USR004',
              email: 'sarah.johnson@archehealthwa.org.au',
              fullName: 'Sarah Johnson',
              role: 'navigator',
              assignedLocations: ['Canning', 'Gosnells'],
              isActive: true,
              createdAt: '2024-02-15T00:00:00Z',
              twoFactorEnabled: false
            }
          ];
          setUsers(mockUsers);
        }
        
        isInitialDataLoaded.current = true;
      } catch (error) {
        console.error('Error loading data from database:', error);
        // Continue with local data if database fails
        isInitialDataLoaded.current = true;
    }
    };
    
    loadData();
  }, []);

  const hasUnreadSubmissions = useMemo(() => {
    return Object.values(patientData).some((data: PatientData) => 
        data.experiences.some(e => !e.isRead) ||
        data.messages.some(m => m.sender === 'patient' && !m.isRead)
    );
  }, [patientData]);

  const handleMarkAsRead = (clientId: string) => {
    setPatientData(prev => {
        const clientData = prev[clientId];
        if (!clientData) return prev;

        const updatedData = {
            ...clientData,
            experiences: clientData.experiences.map(e => ({ ...e, isRead: true })),
            messages: clientData.messages.map(m => ({ ...m, isRead: true })),
        };

        return { ...prev, [clientId]: updatedData };
    });
  };

  const handleStaffLogin = (userRole?: 'admin' | 'coordinator' | 'navigator', userEmail?: string) => {
    // Determine role from email if not provided
    let actualRole = userRole;
    if (!actualRole && userEmail) {
      if (userEmail === 'admin@multinav.com') actualRole = 'admin';
      else if (userEmail === 'coordinator@multinav.com') actualRole = 'coordinator';
      else if (userEmail === 'navigator@multinav.com') actualRole = 'navigator';
      else actualRole = 'navigator'; // Default for new users
    }
    
    const staffSession = { 
      role: 'staff' as const, 
      userRole: actualRole || 'navigator',
      userEmail: userEmail || 'unknown@multinav.com'
    };
    setSession(staffSession);
    localStorage.setItem('session', JSON.stringify(staffSession));
    
    // Set appropriate default view based on role
    if (actualRole === 'navigator') {
      setActiveView('demographics'); // Navigators start with Client Management
    } else {
      setActiveView('dashboard'); // Coordinators and Admins start with Dashboard
    }
  };

  const handlePatientLogin = (client: Client) => {
      const patientSession = { role: 'patient' as const, user: client };
      setSession(patientSession);
      localStorage.setItem('session', JSON.stringify(patientSession));
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem('session');
  };

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
        const newMode = !prev;
        if (newMode) {
          document.documentElement.classList.add('dark');
          localStorage.setItem('theme', 'dark');
        } else {
          document.documentElement.classList.remove('dark');
          localStorage.setItem('theme', 'light');
        }
        return newMode;
    });
  };

  const allNavItems = [
    { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard /> },
    { key: 'demographics', label: 'Client Management', icon: <Users /> },
    { key: 'activities', label: 'Health Navigation', icon: <HeartPulse /> },
    { key: 'workforce', label: 'Workforce Tracking', icon: <Briefcase /> },
    { key: 'unifiedReporting', label: 'Unified Reporting', icon: <FileBarChart /> },
    { key: 'reporting', label: 'Program Reporting', icon: <FilePieChart /> },
    { key: 'localDemographics', label: 'Local Demographic Insights', icon: <Map /> },
    { key: 'gpEngagement', label: 'Primary Care/GP Engagement', icon: <Stethoscope /> },
    { key: 'resources', label: 'Program Resources', icon: <FolderKanban /> },
    { key: 'insights', label: 'AI Insights', icon: <BotMessageSquare /> },
    { key: 'userManagement', label: 'User Management', icon: <UserCog /> },
    { key: 'staffPerformance', label: 'Staff Performance', icon: <BarChart3 /> }
  ];

  // Filter navigation items based on user role
  const navItems = useMemo(() => {
    if (!session || session.role !== 'staff') return allNavItems;
    
    const userRole = session.userRole || 'navigator';
    
    // Define which items each role can access
    const navigatorItems = ['demographics', 'activities', 'localDemographics', 'gpEngagement', 'resources'];
    const coordinatorItems = [...navigatorItems, 'dashboard', 'reporting', 'workforce', 'insights'];
    const adminItems = allNavItems.map(item => item.key); // Admin gets everything
    
    let allowedItems: string[];
    switch (userRole) {
      case 'admin':
        allowedItems = adminItems;
        break;
      case 'coordinator':
        allowedItems = coordinatorItems;
        break;
      case 'navigator':
      default:
        allowedItems = navigatorItems;
        break;
    }
    
    return allNavItems.filter(item => allowedItems.includes(item.key));
  }, [session]);

  const renderStaffContent = () => {
    switch(activeView) {
      case 'dashboard':
        return <Dashboard clients={clients} activities={activities} workforce={workforce} resources={resources} setActiveView={setActiveView} isDarkMode={isDarkMode} />;
      case 'demographics':
        return <ClientDemographics clients={clients} setClients={setClients} />;
      case 'activities':
        return <HealthNavigationActivities 
                    activities={activities} 
                    setActivities={setActivities} 
                    clients={clients}
                    hasUnreadSubmissions={hasUnreadSubmissions}
                    onViewSubmissions={() => setIsSubmissionsModalOpen(true)}
                    currentUser={{
                        email: session?.userEmail || '',
                        role: session?.userRole || 'navigator',
                        // Use the full name from users list if available, otherwise use email prefix
                        name: users.find(u => u.email === session?.userEmail)?.fullName || session?.userEmail?.split('@')[0] || 'Unknown'
                    }}
                />;
      case 'workforce':
        return <WorkforceTracking workforce={workforce} setWorkforce={setWorkforce} />;
      case 'unifiedReporting':
        return <UnifiedReporting clients={clients} activities={activities} />;
      case 'reporting':
        return <ProgramReporting clients={clients} activities={activities} workforce={workforce} />;
      case 'localDemographics':
        return <LocalDemographics />;
      case 'gpEngagement':
        return <GpEngagement practices={gpPractices} setPractices={setGpPractices} />;
      case 'resources':
        return <ProgramResources resources={resources} setResources={setResources} />;
      case 'insights':
        return <AiInsightsDashboard clientsData={clients} activityData={activities} workforceData={workforce} />;
      case 'userManagement':
        return <UserManagement users={users} setUsers={setUsers} />;
      case 'staffPerformance':
        return <StaffPerformance activities={activities} clients={clients} users={users} />;
      default:
        return <Dashboard clients={clients} activities={activities} workforce={workforce} resources={resources} setActiveView={setActiveView} isDarkMode={isDarkMode} />;
    }
  };

  const NavLink: React.FC<{item: typeof navItems[0]}> = ({ item }) => (
    <a
        href="#"
        onClick={(e) => {
            e.preventDefault();
            setActiveView(item.key);
            setIsSidebarOpen(false);
        }}
        className={`flex items-center p-3 my-1 rounded-lg transition-colors duration-200 ${
            activeView === item.key
                ? 'bg-lime-green-400 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-300 hover:bg-baby-blue-100 dark:hover:bg-gray-700'
        }`}
    >
        {React.cloneElement(item.icon, { className: 'w-6 h-6 mr-3 flex-shrink-0' })}
        <span className="font-medium">{item.label}</span>
    </a>
  );
  
  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
        <div className="flex items-center space-x-3 p-4 border-b border-gray-200 dark:border-gray-700 h-16">
           <Leaf className="h-8 w-8 text-lime-green-500" />
           <h1 className={`text-xl font-bold text-baby-blue-500 dark:text-white`}>
             MultiNav iCRM
           </h1>
        </div>
        <nav className="flex-1 p-2">
            {navItems.map(item => <NavLink key={item.key} item={item} />)}
        </nav>
    </div>
  );
  
  if (!session) {
    return <SimpleAuthPage onStaffLogin={handleStaffLogin} onPatientLogin={handlePatientLogin} clients={clients} />;
  }

  if (session.role === 'patient' && session.user) {
    const currentPatientData = patientData[session.user.id] || { experiences: [], messages: [] };
    return (
        <MyNavigation
            client={session.user}
            data={currentPatientData}
            setData={(newClientData) => {
                setPatientData(prev => ({
                    ...prev,
                    [session.user!.id]: newClientData
                }));
            }}
            onLogout={handleLogout}
            isDarkMode={isDarkMode}
            toggleDarkMode={toggleDarkMode}
        />
    );
  }

  return (
    <div className={`flex h-screen ${isDarkMode ? 'dark bg-gray-900' : 'bg-baby-blue-50'} font-sans`}>
        {/* Desktop Sidebar */}
        <aside className="w-64 flex-shrink-0 shadow-lg hidden md:block">
            <SidebarContent />
        </aside>

        {/* Mobile Sidebar (off-canvas) */}
         <div className={`fixed inset-0 z-30 transition-opacity bg-black bg-opacity-50 md:hidden ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
             onClick={() => setIsSidebarOpen(false)}>
        </div>
        <aside className={`fixed top-0 left-0 h-full w-64 shadow-xl z-40 transform transition-transform md:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
             <SidebarContent />
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
             <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-md h-16 flex-shrink-0">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-full flex justify-between items-center">
                     <div className="flex items-center">
                        <button className="text-gray-500 dark:text-gray-400 focus:outline-none md:hidden" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                            <Menu className="h-6 w-6" />
                        </button>
                        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 ml-2 md:ml-0">
                            {navItems.find(item => item.key === activeView)?.label}
                        </h2>
                    </div>
                    <div className="flex items-center space-x-4">
                        {/* User Role Badge */}
                        {session?.userRole && (
                            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                session.userRole === 'admin' 
                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' 
                                    : session.userRole === 'coordinator'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                                    : 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                            }`}>
                                {session.userRole.toUpperCase()}
                            </div>
                        )}
                        {session?.userEmail && (
                            <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:inline">
                                {session.userEmail}
                            </span>
                        )}
                        <button
                            onClick={toggleDarkMode}
                            className={`p-2 rounded-full ${isDarkMode ? 'text-yellow-400 bg-gray-700' : 'text-baby-blue-500 bg-baby-blue-200'}`}
                            aria-label="Toggle dark mode"
                        >
                            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-full text-red-500 bg-red-100 dark:text-red-300 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors"
                            aria-label="Logout"
                            title="Logout"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>
            <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">
                <div className={`mx-auto ${['workforce', 'gpEngagement', 'localDemographics', 'reporting'].includes(activeView) ? 'max-w-screen-2xl' : 'max-w-7xl'}`}>
                    {renderStaffContent()}
                </div>
            </main>
        </div>
        {session.role === 'staff' && (
            <PatientSubmissionsViewer
                isOpen={isSubmissionsModalOpen}
                onClose={() => setIsSubmissionsModalOpen(false)}
                clients={clients}
                patientData={patientData}
                onMarkAsRead={handleMarkAsRead}
            />
        )}
    </div>
  );
};

export default App;


