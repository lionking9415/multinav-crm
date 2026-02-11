import React, { useState } from 'react';
import type { HealthActivity, Client } from '../types';
import Card from './Card';
import CheckboxGroup from './CheckboxGroup';
import Accordion from './Accordion';
import { 
  NAVIGATION_ASSISTANCE_OPTIONS, 
  SERVICES_ACCESSED_OPTIONS, 
  EDUCATIONAL_RESOURCES_OPTIONS, 
  PREVENTIVE_SERVICES_OPTIONS, 
  MATERNAL_CHILD_HEALTH_OPTIONS 
} from '../constants';

interface ActivityFormProps {
  initialActivity: HealthActivity | null;
  clients: Client[];
  onSave: (activity: HealthActivity) => void;
  onCancel: () => void;
  readOnly?: boolean;
}

const ActivityForm: React.FC<ActivityFormProps> = ({ initialActivity, clients, onSave, onCancel, readOnly }) => {
  const [activity, setActivity] = useState<HealthActivity>({
    id: initialActivity?.id || '',
    clientId: initialActivity?.clientId || (clients.length > 0 ? clients[0].id : ''),
    date: initialActivity?.date || new Date().toISOString().split('T')[0],
    navigationAssistance: initialActivity?.navigationAssistance || [],
    servicesAccessed: initialActivity?.servicesAccessed || [],
    referralsMade: initialActivity?.referralsMade || '',
    followUpActions: initialActivity?.followUpActions || '',
    educationalResources: initialActivity?.educationalResources || [],
    preventiveServices: initialActivity?.preventiveServices || [],
    maternalChildHealth: initialActivity?.maternalChildHealth || [],
    otherAssistance: initialActivity?.otherAssistance || '',
    otherEducation: initialActivity?.otherEducation || '',
    isDischarge: initialActivity?.isDischarge || false,
    dischargeDate: initialActivity?.dischargeDate || '',
    dischargeReason: initialActivity?.dischargeReason || '',
    location: initialActivity?.location || ''
  });
  
  const handleCheckboxChange = (field: keyof HealthActivity) => (selected: string[]) => {
    setActivity({ ...activity, [field]: selected });
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setActivity({ ...activity, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activity.clientId) {
        alert('You must select a client for this activity.');
        return;
    }
    onSave(activity);
  };

  return (
    <Card>
      <form onSubmit={handleSubmit}>
         <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">
            {readOnly ? 'View Activity' : (initialActivity ? 'Edit Activity' : 'Log New Activity')}
        </h2>
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                 <div>
                    <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Client</label>
                    <select 
                        id="clientId" 
                        name="clientId" 
                        value={activity.clientId} 
                        onChange={handleInputChange} 
                        required
                        disabled={readOnly}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
                    >
                        <option value="" disabled>Select a client</option>
                        {clients.map(client => (
                            <option key={client.id} value={client.id}>{client.fullName}</option>
                        ))}
                    </select>
                </div>
                 <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Activity Date</label>
                    <input 
                        type="date"
                        name="date"
                        id="date"
                        value={activity.date}
                        onChange={handleInputChange}
                        required
                        disabled={readOnly}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed" />
                </div>
            </div>
            
            {/* Location of Service Delivery */}
            <div className="mb-4">
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Location of Service Delivery <span className="text-red-500">*</span>
                </label>
                <select
                    name="location"
                    id="location"
                    value={activity.location || ''}
                    onChange={handleInputChange}
                    required
                    disabled={readOnly}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
                >
                    <option value="">Select Location</option>
                    <option value="Canning">Canning</option>
                    <option value="Gosnells">Gosnells</option>
                    <option value="Mandurah">Mandurah</option>
                    <option value="Stirling">Stirling</option>
                    <option value="Swan">Swan</option>
                    <option value="Wanneroo">Wanneroo</option>
                </select>
            </div>
            
            <Accordion title="Assistance & Services" startOpen={true}>
              <div className="space-y-6">
                <CheckboxGroup
                  label="Type of Navigation Assistance"
                  options={NAVIGATION_ASSISTANCE_OPTIONS}
                  selectedOptions={activity.navigationAssistance}
                  onChange={handleCheckboxChange('navigationAssistance')}
                  disabled={readOnly}
                />
                {activity.navigationAssistance.includes('Other Navigation Assistance') && (
                  <div className="ml-6">
                    <label htmlFor="otherAssistance" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Please specify other navigation assistance:
                    </label>
                    <textarea 
                      name="otherAssistance" 
                      id="otherAssistance" 
                      value={activity.otherAssistance || ''} 
                      onChange={handleInputChange} 
                      rows={2} 
                      placeholder="Describe the other navigation assistance provided..."
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" 
                    />
                  </div>
                )}
                
                <CheckboxGroup
                  label="Healthcare Services Accessed"
                  options={SERVICES_ACCESSED_OPTIONS}
                  selectedOptions={activity.servicesAccessed}
                  onChange={handleCheckboxChange('servicesAccessed')}
                  disabled={readOnly}
                />
                {activity.servicesAccessed.includes('Other Services') && (
                  <div className="ml-6">
                    <label htmlFor="otherServices" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Please specify other services:
                    </label>
                    <textarea 
                      name="otherAssistance" 
                      id="otherServices" 
                      value={activity.otherAssistance || ''} 
                      onChange={handleInputChange} 
                      rows={2} 
                      placeholder="Describe the other services accessed..."
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" 
                    />
                  </div>
                )}
              </div>
            </Accordion>

            <Accordion title="Notes & Follow-up">
              <div className="space-y-6">
                <div>
                  <label htmlFor="referralsMade" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Referrals Made</label>
                  <textarea name="referralsMade" id="referralsMade" value={activity.referralsMade} onChange={handleInputChange} rows={3} disabled={readOnly} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed" />
                </div>
                
                <div>
                  <label htmlFor="followUpActions" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Follow-up Actions Taken</label>
                  <textarea name="followUpActions" id="followUpActions" value={activity.followUpActions} onChange={handleInputChange} rows={3} disabled={readOnly} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed" />
                </div>
              </div>
            </Accordion>
            
            <Accordion title="Education & Health Topics">
              <div className="space-y-6">
                <CheckboxGroup
                  label="Educational Resources Provided"
                  options={EDUCATIONAL_RESOURCES_OPTIONS}
                  selectedOptions={activity.educationalResources}
                  onChange={handleCheckboxChange('educationalResources')}
                  disabled={readOnly}
                />
                {activity.educationalResources.includes('Other Education Topics') && (
                  <div className="ml-6">
                    <label htmlFor="otherEducation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Please specify other education topics:
                    </label>
                    <textarea 
                      name="otherEducation" 
                      id="otherEducation" 
                      value={activity.otherEducation || ''} 
                      onChange={handleInputChange} 
                      rows={2} 
                      placeholder="Describe the other education topics provided..."
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" 
                    />
                  </div>
                )}
                
                <CheckboxGroup
                  label="Preventive Health Services"
                  options={PREVENTIVE_SERVICES_OPTIONS}
                  selectedOptions={activity.preventiveServices}
                  onChange={handleCheckboxChange('preventiveServices')}
                  disabled={readOnly}
                />
                <CheckboxGroup
                  label="Maternal and Child Health"
                  options={MATERNAL_CHILD_HEALTH_OPTIONS}
                  selectedOptions={activity.maternalChildHealth}
                  onChange={handleCheckboxChange('maternalChildHealth')}
                  disabled={readOnly}
                />
              </div>
            </Accordion>
            
            <Accordion title="Discharge Information">
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isDischarge"
                    name="isDischarge"
                    checked={activity.isDischarge || false}
                    onChange={(e) => setActivity({ ...activity, isDischarge: e.target.checked })}
                    disabled={readOnly}
                    className="h-4 w-4 text-lime-green-600 focus:ring-lime-green-500 border-gray-300 rounded disabled:cursor-not-allowed"
                  />
                  <label htmlFor="isDischarge" className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
                    This is a discharge activity
                  </label>
                </div>
                
                {activity.isDischarge && (
                  <>
                    <div>
                      <label htmlFor="dischargeDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Discharge Date
                      </label>
                      <input 
                        type="date"
                        name="dischargeDate"
                        id="dischargeDate"
                        value={activity.dischargeDate || ''}
                        onChange={handleInputChange}
                        disabled={readOnly}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed" 
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="dischargeReason" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Discharge Reason
                      </label>
                      <textarea 
                        name="dischargeReason" 
                        id="dischargeReason" 
                        value={activity.dischargeReason || ''} 
                        onChange={handleInputChange} 
                        rows={3} 
                        placeholder="Enter reason for discharge..."
                        disabled={readOnly}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed" 
                      />
                    </div>
                  </>
                )}
              </div>
            </Accordion>
        </div>
        <div className="mt-8 flex justify-end space-x-4">
            <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 focus:outline-none">
                {readOnly ? 'Back' : 'Cancel'}
            </button>
            {!readOnly && (
              <button type="submit" className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-lime-green-500 hover:bg-lime-green-600 focus:outline-none">
                  Save Activity
              </button>
            )}
        </div>
      </form>
    </Card>
  );
};

export default ActivityForm;
