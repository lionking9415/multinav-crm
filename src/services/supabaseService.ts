import { createClient } from '@supabase/supabase-js';
import type { 
  Client, 
  HealthActivity, 
  WorkforceData, 
  ProgramResource, 
  GpPractice, 
  PatientData,
  ExperienceEntry,
  ChatMessage,
  Workforce,
  User,
  UserRole,
  UserActivity,
  CommunityEngagement,
  SurveyResponse
} from '../types';

// Initialize Supabase client
// These should be set in environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client Management Functions
export const clientService = {
  async getAll(): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(client => ({
      id: client.id,
      fullName: client.full_name,
      sex: client.sex,
      dob: client.date_of_birth,
      age: client.age,
      ethnicity: client.ethnicity,
      countryOfBirth: client.country_of_birth,
      languages: client.languages || [],
      referralSource: client.referral_source,
      referralDate: client.referral_date,
      address: client.address,
      postcode: client.postcode,
      region: client.region,
      password: client.password_hash || '', // Return password for staff editing
      phoneNumber: client.phone_number || undefined,
      emergencyContactPhone: client.emergency_contact_phone || undefined,
      assignedStaffId: client.assigned_staff_id || undefined
    }));
  },

  async create(client: Client): Promise<Client> {
    const { data, error } = await supabase
      .from('clients')
      .insert({
        id: client.id,
        full_name: client.fullName,
        sex: client.sex,
        date_of_birth: client.dob,
        age: client.age,
        ethnicity: client.ethnicity,
        country_of_birth: client.countryOfBirth,
        languages: client.languages,
        referral_source: client.referralSource,
        referral_date: client.referralDate,
        address: client.address,
        postcode: client.postcode,
        region: client.region,
        password_hash: client.password ? await hashPassword(client.password) : null,
        phone_number: client.phoneNumber || null,
        emergency_contact_phone: client.emergencyContactPhone || null,
        assigned_staff_id: client.assignedStaffId || null
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      ...client,
      password: undefined
    };
  },

  async update(id: string, client: Partial<Client>): Promise<Client> {
    const updateData: any = {};
    
    if (client.fullName !== undefined) updateData.full_name = client.fullName;
    if (client.sex !== undefined) updateData.sex = client.sex;
    if (client.dob !== undefined) updateData.date_of_birth = client.dob;
    if (client.age !== undefined) updateData.age = client.age;
    if (client.ethnicity !== undefined) updateData.ethnicity = client.ethnicity;
    if (client.countryOfBirth !== undefined) updateData.country_of_birth = client.countryOfBirth;
    if (client.languages !== undefined) updateData.languages = client.languages;
    if (client.referralSource !== undefined) updateData.referral_source = client.referralSource;
    if (client.referralDate !== undefined) updateData.referral_date = client.referralDate;
    if (client.address !== undefined) updateData.address = client.address;
    if (client.postcode !== undefined) updateData.postcode = client.postcode;
    if (client.region !== undefined) updateData.region = client.region;
    if (client.assignedStaffId !== undefined) updateData.assigned_staff_id = client.assignedStaffId || null;
    if (client.phoneNumber !== undefined) updateData.phone_number = client.phoneNumber || null;
    if (client.emergencyContactPhone !== undefined) updateData.emergency_contact_phone = client.emergencyContactPhone || null;
    // Update password if provided (non-empty string)
    if (client.password && client.password.trim() !== '') {
      updateData.password_hash = client.password;
      console.log('[ClientService] Updating password for client:', id);
    }
    
    const { data, error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      fullName: data.full_name,
      sex: data.sex,
      dob: data.date_of_birth,
      age: data.age,
      ethnicity: data.ethnicity,
      countryOfBirth: data.country_of_birth,
      languages: data.languages || [],
      referralSource: data.referral_source,
      referralDate: data.referral_date,
      address: data.address,
      postcode: data.postcode,
      region: data.region,
      phoneNumber: data.phone_number || undefined,
      emergencyContactPhone: data.emergency_contact_phone || undefined,
      assignedStaffId: data.assigned_staff_id || undefined
    };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async authenticate(clientId: string, password: string): Promise<Client | null> {
    // Normalize client ID - trim whitespace and convert to uppercase for consistent matching
    const normalizedClientId = clientId.trim().toUpperCase();
    
    console.log('[Auth] Attempting authentication for client ID:', normalizedClientId);
    
    // Try exact match first
    let { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', normalizedClientId)
      .single();
    
    // If not found, try case-insensitive search using ilike
    if (error || !data) {
      console.log('[Auth] Exact match failed, trying case-insensitive search...');
      const { data: iData, error: iError } = await supabase
        .from('clients')
        .select('*')
        .ilike('id', normalizedClientId)
        .single();
      
      data = iData;
      error = iError;
    }
    
    if (error) {
      console.log('[Auth] Client lookup error:', error.message);
      return null;
    }
    
    if (!data) {
      console.log('[Auth] No client found with ID:', normalizedClientId);
      return null;
    }
    
    console.log('[Auth] Client found:', data.id, '- checking password...');
    
    // Check password - compare directly and also with hash
    const passwordMatch = 
      data.password_hash === password || 
      data.password_hash === await hashPassword(password);
    
    if (!passwordMatch) {
      console.log('[Auth] Password mismatch for client:', data.id);
      console.log('[Auth] Stored hash length:', data.password_hash?.length || 0);
      console.log('[Auth] Provided password length:', password.length);
      return null;
    }
    
    console.log('[Auth] Authentication successful for client:', data.id);
    
    return {
      id: data.id,
      fullName: data.full_name,
      sex: data.sex,
      dob: data.date_of_birth,
      age: data.age,
      ethnicity: data.ethnicity,
      countryOfBirth: data.country_of_birth,
      languages: data.languages || [],
      referralSource: data.referral_source,
      referralDate: data.referral_date,
      address: data.address,
      postcode: data.postcode,
      region: data.region,
      phoneNumber: data.phone_number || undefined,
      emergencyContactPhone: data.emergency_contact_phone || undefined,
      assignedStaffId: data.assigned_staff_id || undefined
    };
  }
};

// Health Activities Functions
export const activityService = {
  async getAll(): Promise<HealthActivity[]> {
    const { data, error } = await supabase
      .from('health_activities')
      .select('*')
      .order('activity_date', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(activity => ({
      id: activity.activity_id,
      clientId: activity.client_id,
      date: activity.activity_date,
      navigationAssistance: activity.navigation_assistance || [],
      servicesAccessed: activity.services_accessed || [],
      referralsMade: activity.referrals_made || '',
      followUpActions: activity.follow_up_actions || '',
      educationalResources: activity.educational_resources || [],
      preventiveServices: activity.preventive_services || [],
      maternalChildHealth: activity.maternal_child_health || [],
      location: activity.location || '',
      otherAssistance: activity.other_assistance || '',
      otherEducation: activity.other_education || '',
      isDischarge: activity.is_discharge || false,
      dischargeDate: activity.discharge_date || '',
      dischargeReason: activity.discharge_reason || '',
      createdBy: activity.created_by,
      createdByName: activity.created_by_name,
      createdByRole: activity.created_by_role,
      createdAt: activity.created_at
    }));
  },

  async create(activity: HealthActivity): Promise<HealthActivity> {
    const { data, error } = await supabase
      .from('health_activities')
      .insert({
        activity_id: activity.id,
        client_id: activity.clientId,
        activity_date: activity.date,
        navigation_assistance: activity.navigationAssistance,
        services_accessed: activity.servicesAccessed,
        referrals_made: activity.referralsMade,
        follow_up_actions: activity.followUpActions,
        educational_resources: activity.educationalResources,
        preventive_services: activity.preventiveServices,
        maternal_child_health: activity.maternalChildHealth,
        location: activity.location || '',
        other_assistance: activity.otherAssistance || '',
        other_education: activity.otherEducation || '',
        is_discharge: activity.isDischarge || false,
        discharge_date: activity.dischargeDate && activity.dischargeDate !== '' ? activity.dischargeDate : null,
        discharge_reason: activity.dischargeReason || '',
        created_by: activity.createdBy || '',
        created_by_name: activity.createdByName || '',
        created_by_role: activity.createdByRole || 'navigator',
        created_at: activity.createdAt || new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return activity;
  },

  async update(id: string, activity: Partial<HealthActivity>): Promise<HealthActivity> {
    const updateData: any = {};
    
    if (activity.clientId !== undefined) updateData.client_id = activity.clientId;
    if (activity.date !== undefined) updateData.activity_date = activity.date;
    if (activity.navigationAssistance !== undefined) updateData.navigation_assistance = activity.navigationAssistance;
    if (activity.servicesAccessed !== undefined) updateData.services_accessed = activity.servicesAccessed;
    if (activity.referralsMade !== undefined) updateData.referrals_made = activity.referralsMade;
    if (activity.followUpActions !== undefined) updateData.follow_up_actions = activity.followUpActions;
    if (activity.educationalResources !== undefined) updateData.educational_resources = activity.educationalResources;
    if (activity.preventiveServices !== undefined) updateData.preventive_services = activity.preventiveServices;
    if (activity.maternalChildHealth !== undefined) updateData.maternal_child_health = activity.maternalChildHealth;
    
    // Add location and other new fields
    if (activity.location !== undefined) updateData.location = activity.location;
    if (activity.otherAssistance !== undefined) updateData.other_assistance = activity.otherAssistance;
    if (activity.otherEducation !== undefined) updateData.other_education = activity.otherEducation;
    if (activity.isDischarge !== undefined) updateData.is_discharge = activity.isDischarge;
    if (activity.dischargeDate !== undefined) updateData.discharge_date = activity.dischargeDate && activity.dischargeDate !== '' ? activity.dischargeDate : null;
    if (activity.dischargeReason !== undefined) updateData.discharge_reason = activity.dischargeReason;
    
    const { data, error } = await supabase
      .from('health_activities')
      .update(updateData)
      .eq('activity_id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.activity_id,
      clientId: data.client_id,
      date: data.activity_date,
      navigationAssistance: data.navigation_assistance || [],
      servicesAccessed: data.services_accessed || [],
      referralsMade: data.referrals_made || '',
      followUpActions: data.follow_up_actions || '',
      educationalResources: data.educational_resources || [],
      preventiveServices: data.preventive_services || [],
      maternalChildHealth: data.maternal_child_health || [],
      location: data.location || '',
      otherAssistance: data.other_assistance || '',
      otherEducation: data.other_education || '',
      isDischarge: data.is_discharge || false,
      dischargeDate: data.discharge_date || '',
      dischargeReason: data.discharge_reason || '',
      createdBy: data.created_by,
      createdByName: data.created_by_name,
      createdByRole: data.created_by_role,
      createdAt: data.created_at
    };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('health_activities')
      .delete()
      .eq('activity_id', id);
    
    if (error) throw error;
  }
};

// Workforce Functions
export const workforceService = {
  async getAll(): Promise<WorkforceData> {
    const { data, error } = await supabase
      .from('workforce')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    const workforce: WorkforceData = { north: [], south: [] };
    
    (data || []).forEach(staff => {
      const staffMember: Workforce = {
        fte: staff.fte,
        role: staff.role,
        ethnicity: staff.ethnicity,
        languages: staff.languages || []
      };
      
      if (staff.region === 'north') {
        workforce.north.push(staffMember);
      } else if (staff.region === 'south') {
        workforce.south.push(staffMember);
      }
    });
    
    return workforce;
  },

  async create(region: 'north' | 'south', staff: Workforce): Promise<void> {
    const { error } = await supabase
      .from('workforce')
      .insert({
        region,
        fte: staff.fte,
        role: staff.role,
        ethnicity: staff.ethnicity,
        languages: staff.languages
      });
    
    if (error) throw error;
  },

  async deleteAll(): Promise<void> {
    const { error } = await supabase
      .from('workforce')
      .delete()
      .neq('id', 0); // Delete all records
    
    if (error) throw error;
  },

  async replaceAll(workforce: WorkforceData): Promise<void> {
    // Delete existing records
    await this.deleteAll();
    
    // Insert new records
    const records = [
      ...workforce.north.map(staff => ({ ...staff, region: 'north' as const })),
      ...workforce.south.map(staff => ({ ...staff, region: 'south' as const }))
    ];
    
    for (const record of records) {
      await this.create(record.region, record);
    }
  }
};

// Program Resources Functions
export const resourceService = {
  async getAll(): Promise<ProgramResource[]> {
    const { data, error } = await supabase
      .from('program_resources')
      .select('*')
      .order('date_added', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(resource => ({
      id: resource.id,
      name: resource.name,
      type: resource.type,
      dateAdded: resource.date_added,
      category: resource.category,
      fileUrl: resource.file_url,
      fileName: resource.file_name,
      fileSize: resource.file_size,
      fileType: resource.file_type,
      storagePath: resource.storage_path
    }));
  },

  async create(resource: ProgramResource): Promise<ProgramResource> {
    const { data, error } = await supabase
      .from('program_resources')
      .insert({
        id: resource.id,
        name: resource.name,
        type: resource.type,
        date_added: resource.dateAdded,
        category: resource.category,
        file_url: resource.fileUrl,
        file_name: resource.fileName,
        file_size: resource.fileSize,
        file_type: resource.fileType,
        storage_path: resource.storagePath
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return resource;
  },

  async update(id: string, resource: Partial<ProgramResource>): Promise<ProgramResource> {
    const updateData: any = {};
    
    if (resource.name !== undefined) updateData.name = resource.name;
    if (resource.type !== undefined) updateData.type = resource.type;
    if (resource.dateAdded !== undefined) updateData.date_added = resource.dateAdded;
    if (resource.category !== undefined) updateData.category = resource.category;
    if (resource.fileUrl !== undefined) updateData.file_url = resource.fileUrl;
    if (resource.fileName !== undefined) updateData.file_name = resource.fileName;
    if (resource.fileSize !== undefined) updateData.file_size = resource.fileSize;
    if (resource.fileType !== undefined) updateData.file_type = resource.fileType;
    if (resource.storagePath !== undefined) updateData.storage_path = resource.storagePath;

    const { data, error } = await supabase
      .from('program_resources')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      name: data.name,
      type: data.type,
      dateAdded: data.date_added,
      category: data.category,
      fileUrl: data.file_url,
      fileName: data.file_name,
      fileSize: data.file_size,
      fileType: data.file_type,
      storagePath: data.storage_path
    };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('program_resources')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// GP Practices Functions
export const gpPracticeService = {
  async getAll(): Promise<GpPractice[]> {
    const { data, error } = await supabase
      .from('gp_practices')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    
    return (data || []).map(practice => ({
      id: practice.id,
      name: practice.name,
      address: practice.address,
      phone: practice.phone,
      website: practice.website,
      notes: practice.notes
    }));
  },

  async create(practice: GpPractice): Promise<GpPractice> {
    const { data, error } = await supabase
      .from('gp_practices')
      .insert({
        id: practice.id,
        name: practice.name,
        address: practice.address,
        phone: practice.phone,
        website: practice.website,
        notes: practice.notes
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return practice;
  },

  async update(id: string, practice: Partial<GpPractice>): Promise<GpPractice> {
    const { data, error } = await supabase
      .from('gp_practices')
      .update({
        name: practice.name,
        address: practice.address,
        phone: practice.phone,
        website: practice.website,
        notes: practice.notes
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      name: data.name,
      address: data.address,
      phone: data.phone,
      website: data.website,
      notes: data.notes
    };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('gp_practices')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Patient Data Functions
export const patientDataService = {
  async getExperiences(clientId: string): Promise<ExperienceEntry[]> {
    const { data, error } = await supabase
      .from('patient_experiences')
      .select('*')
      .eq('client_id', clientId)
      .order('experience_date', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(exp => ({
      id: exp.experience_id,
      date: exp.experience_date,
      content: exp.content,
      isRead: exp.is_read,
      attachments: exp.attachments || []
    }));
  },

  async createExperience(clientId: string, experience: ExperienceEntry): Promise<ExperienceEntry> {
    const { data, error } = await supabase
      .from('patient_experiences')
      .insert({
        experience_id: experience.id,
        client_id: clientId,
        experience_date: experience.date,
        content: experience.content,
        is_read: experience.isRead || false,
        attachments: experience.attachments || []
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return experience;
  },

  async markExperienceAsRead(experienceId: string): Promise<void> {
    const { error } = await supabase
      .from('patient_experiences')
      .update({ is_read: true })
      .eq('experience_id', experienceId);
    
    if (error) throw error;
  },

  async getMessages(clientId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('patient_messages')
      .select('*')
      .eq('client_id', clientId)
      .order('timestamp', { ascending: true });
    
    if (error) throw error;
    
    return (data || []).map(msg => ({
      id: msg.message_id,
      timestamp: msg.timestamp,
      sender: msg.sender as 'patient' | 'navigator',
      text: msg.text,
      language: msg.language,
      isRead: msg.is_read
    }));
  },

  async createMessage(clientId: string, message: ChatMessage): Promise<ChatMessage> {
    const { data, error } = await supabase
      .from('patient_messages')
      .insert({
        message_id: message.id,
        client_id: clientId,
        timestamp: message.timestamp,
        sender: message.sender,
        text: message.text,
        language: message.language,
        is_read: message.isRead || false
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return message;
  },

  async markMessageAsRead(messageId: string): Promise<void> {
    const { error } = await supabase
      .from('patient_messages')
      .update({ is_read: true })
      .eq('message_id', messageId);
    
    if (error) throw error;
  },

  async getAllPatientData(): Promise<Record<string, PatientData>> {
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id');
    
    if (clientsError) throw clientsError;
    
    const result: Record<string, PatientData> = {};
    
    for (const client of (clients || [])) {
      const experiences = await this.getExperiences(client.id);
      const messages = await this.getMessages(client.id);
      
      result[client.id] = {
        experiences,
        messages
      };
    }
    
    return result;
  }
};

// User Management Functions
export const userService = {
  async authenticate(email: string, password: string): Promise<{success: boolean, user?: User, message?: string}> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password_hash', password) // In production, use proper password verification
        .single();
      
      if (error || !data) {
        return { success: false, message: 'Invalid email or password' };
      }

      if (!data.is_active) {
        return { success: false, message: 'Account is inactive' };
      }

      // Update last login
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.id);

      const user: User = {
        id: data.id,
        email: data.email,
        fullName: data.full_name,
        role: data.role as UserRole,
        assignedLocations: data.assigned_locations || [],
        isActive: data.is_active,
        createdAt: data.created_at,
        lastLogin: data.last_login,
        twoFactorEnabled: data.two_factor_enabled,
        phoneNumber: data.phone_number
      };

      return { success: true, user };
    } catch (error) {
      console.error('Authentication error:', error);
      return { success: false, message: 'Authentication failed' };
    }
  },

  async getAll(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(user => ({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role as UserRole,
      assignedLocations: user.assigned_locations || [],
      isActive: user.is_active,
      createdAt: user.created_at,
      lastLogin: user.last_login,
      twoFactorEnabled: user.two_factor_enabled,
      phoneNumber: user.phone_number
    }));
  },

  async create(user: Omit<User, 'id' | 'createdAt'> & { password: string }): Promise<User> {
    const id = `USR${Date.now()}`;
    
    const { data, error } = await supabase
      .from('users')
      .insert({
        id,
        email: user.email,
        password_hash: user.password, // In production, hash the password
        full_name: user.fullName,
        role: user.role,
        assigned_locations: user.assignedLocations,
        is_active: user.isActive,
        two_factor_enabled: user.twoFactorEnabled,
        phone_number: user.phoneNumber
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      email: data.email,
      fullName: data.full_name,
      role: data.role as UserRole,
      assignedLocations: data.assigned_locations || [],
      isActive: data.is_active,
      createdAt: data.created_at,
      lastLogin: data.last_login,
      twoFactorEnabled: data.two_factor_enabled,
      phoneNumber: data.phone_number
    };
  },

  async update(id: string, updates: Partial<User> & { password?: string }): Promise<User> {
    const updateData: any = {};
    
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.fullName !== undefined) updateData.full_name = updates.fullName;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.assignedLocations !== undefined) updateData.assigned_locations = updates.assignedLocations;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    if (updates.twoFactorEnabled !== undefined) updateData.two_factor_enabled = updates.twoFactorEnabled;
    if (updates.phoneNumber !== undefined) updateData.phone_number = updates.phoneNumber;
    
    // Update password if provided (admin password reset)
    if (updates.password && updates.password.trim() !== '') {
      updateData.password_hash = updates.password;
      console.log('[UserService] Updating password for user:', id);
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      email: data.email,
      fullName: data.full_name,
      role: data.role as UserRole,
      assignedLocations: data.assigned_locations || [],
      isActive: data.is_active,
      createdAt: data.created_at,
      lastLogin: data.last_login,
      twoFactorEnabled: data.two_factor_enabled,
      phoneNumber: data.phone_number
    };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Activity Log Functions
export const activityLogService = {
  async create(log: Omit<UserActivity, 'id'>): Promise<void> {
    const { error } = await supabase
      .from('user_activity_logs')
      .insert({
        user_id: log.userId,
        user_email: log.userEmail,
        user_name: log.userName,
        action: log.action,
        details: log.details,
        location: log.location,
        timestamp: log.timestamp,
        ip_address: log.ipAddress,
        user_agent: log.userAgent
      });
    
    if (error) throw error;
  },

  async getAll(filters?: { userId?: string; location?: string; startDate?: string; endDate?: string }): Promise<UserActivity[]> {
    let query = supabase
      .from('user_activity_logs')
      .select('*')
      .order('timestamp', { ascending: false });
    
    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters?.location) {
      query = query.eq('location', filters.location);
    }
    if (filters?.startDate) {
      query = query.gte('timestamp', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('timestamp', filters.endDate);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return (data || []).map(log => ({
      id: log.id.toString(),
      userId: log.user_id,
      userEmail: log.user_email,
      userName: log.user_name,
      action: log.action,
      details: log.details,
      location: log.location,
      timestamp: log.timestamp,
      ipAddress: log.ip_address,
      userAgent: log.user_agent
    }));
  }
};

// Community Engagement Functions
export const communityEngagementService = {
  async getAll(startDate?: string, endDate?: string): Promise<CommunityEngagement[]> {
    let query = supabase
      .from('community_engagements')
      .select('*')
      .order('date_of_meeting', { ascending: false });
    
    if (startDate) {
      query = query.gte('date_of_meeting', startDate);
    }
    if (endDate) {
      query = query.lte('date_of_meeting', endDate);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return (data || []).map(engagement => ({
      id: engagement.id,
      dateOfMeeting: engagement.date_of_meeting,
      agencyType: engagement.agency_type || 'external',
      agencyName: engagement.agency_name,
      staffPresent: engagement.staff_present,
      meetingNotes: engagement.meeting_notes,
      createdBy: engagement.created_by,
      createdByName: engagement.created_by_name,
      createdByRole: engagement.created_by_role,
      createdAt: engagement.created_at
    }));
  },

  async create(engagement: CommunityEngagement): Promise<CommunityEngagement> {
    const { data, error } = await supabase
      .from('community_engagements')
      .insert({
        id: engagement.id,
        date_of_meeting: engagement.dateOfMeeting,
        agency_type: engagement.agencyType,
        agency_name: engagement.agencyName,
        staff_present: engagement.staffPresent,
        meeting_notes: engagement.meetingNotes,
        created_by: engagement.createdBy,
        created_by_name: engagement.createdByName,
        created_by_role: engagement.createdByRole
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return engagement;
  },

  async update(id: string, engagement: Partial<CommunityEngagement>): Promise<CommunityEngagement> {
    const updateData: any = {};
    
    if (engagement.dateOfMeeting !== undefined) updateData.date_of_meeting = engagement.dateOfMeeting;
    if (engagement.agencyType !== undefined) updateData.agency_type = engagement.agencyType;
    if (engagement.agencyName !== undefined) updateData.agency_name = engagement.agencyName;
    if (engagement.staffPresent !== undefined) updateData.staff_present = engagement.staffPresent;
    if (engagement.meetingNotes !== undefined) updateData.meeting_notes = engagement.meetingNotes;
    
    const { data, error } = await supabase
      .from('community_engagements')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      dateOfMeeting: data.date_of_meeting,
      agencyType: data.agency_type || 'external',
      agencyName: data.agency_name,
      staffPresent: data.staff_present,
      meetingNotes: data.meeting_notes,
      createdBy: data.created_by,
      createdByName: data.created_by_name,
      createdByRole: data.created_by_role,
      createdAt: data.created_at
    };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('community_engagements')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Survey Response Functions
export const surveyService = {
  async getAll(startDate?: string, endDate?: string): Promise<SurveyResponse[]> {
    let query = supabase
      .from('survey_responses')
      .select('*')
      .order('submitted_at', { ascending: false });
    
    if (startDate) {
      query = query.gte('submitted_at', startDate);
    }
    if (endDate) {
      query = query.lte('submitted_at', endDate + 'T23:59:59.999Z');
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return (data || []).map(response => ({
      id: response.id,
      clientId: response.client_id,
      q1Rating: response.q1_rating,
      q2Rating: response.q2_rating,
      q3Rating: response.q3_rating,
      submittedAt: response.submitted_at
    }));
  },

  async create(response: SurveyResponse): Promise<SurveyResponse> {
    const { data, error } = await supabase
      .from('survey_responses')
      .insert({
        id: response.id,
        client_id: response.clientId,
        q1_rating: response.q1Rating,
        q2_rating: response.q2Rating,
        q3_rating: response.q3Rating,
        submitted_at: response.submittedAt
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return response;
  },

  async getByClientId(clientId: string): Promise<SurveyResponse | null> {
    const { data, error } = await supabase
      .from('survey_responses')
      .select('*')
      .eq('client_id', clientId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw error;
    }
    
    return {
      id: data.id,
      clientId: data.client_id,
      q1Rating: data.q1_rating,
      q2Rating: data.q2_rating,
      q3Rating: data.q3_rating,
      submittedAt: data.submitted_at
    };
  }
};

// Helper function for password hashing (simplified - use bcrypt in production)
async function hashPassword(password: string): Promise<string> {
  // In production, use proper password hashing like bcrypt
  // For now, we'll just return the password as-is (NOT SECURE)
  return password;
}

// Initialize database with mock data (for development)
export async function initializeDatabase(): Promise<void> {
  try {
    // Check if data already exists
    const { data: existingClients } = await supabase
      .from('clients')
      .select('id')
      .limit(1);
    
    if (existingClients && existingClients.length > 0) {
      console.log('Database already initialized');
      return;
    }
    
    // Insert mock clients
    const mockClients = [
      { id: 'C4F2A1', fullName: 'John Doe', sex: 'Male', dob: '1985-05-15', age: 39, ethnicity: 'Chinese', countryOfBirth: 'China', languages: ['Mandarin', 'English'], referralSource: 'GP', referralDate: '2024-04-10', password: 'pass123' },
      { id: 'C8B9D3', fullName: 'Jane Smith', sex: 'Female', dob: '1992-08-22', age: 31, ethnicity: 'Afghan', countryOfBirth: 'Afghanistan', languages: ['Dari', 'English'], referralSource: 'Community Org', referralDate: '2024-05-01', password: 'pass123' },
      { id: 'C1E0F5', fullName: 'Abioye Abebe', sex: 'Male', dob: '1995-02-10', age: 29, ethnicity: 'Sudanese', countryOfBirth: 'Sudan', languages: ['Arabic', 'English'], referralSource: 'Hospital', referralDate: '2024-03-15', password: 'pass123' },
      { id: 'C7A6B8', fullName: 'Lien Nguyen', sex: 'Female', dob: '1978-11-30', age: 45, ethnicity: 'Vietnamese', countryOfBirth: 'Vietnam', languages: ['Vietnamese'], referralSource: 'GP', referralDate: '2024-04-20', password: 'pass123' },
      { id: 'C2D3E4', fullName: 'Fatima Al-Jamil', sex: 'Female', dob: '2001-07-19', age: 22, ethnicity: 'Syrian', countryOfBirth: 'Syria', languages: ['Arabic'], referralSource: 'Self', referralDate: '2024-05-12', password: 'pass123' }
    ];
    
    for (const client of mockClients) {
      await clientService.create(client);
    }
    
    console.log('Database initialized with mock data');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}





