import React, { useState, useEffect } from 'react';
import type { HealthActivity, Client } from '../types';
import Card from './Card';
import ActivityForm from './ActivityForm';
import { activityService } from '../services/supabaseService';
import { Plus, Trash2, Pencil, FileDown, Search, Bell, Eye } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface HealthNavigationActivitiesProps {
  activities: HealthActivity[];
  setActivities: React.Dispatch<React.SetStateAction<HealthActivity[]>>;
  clients: Client[];
  hasUnreadSubmissions: boolean;
  onViewSubmissions: () => void;
  currentUser?: {
    email: string;
    role: 'admin' | 'coordinator' | 'navigator';
    name: string;
  };
}

const HealthNavigationActivities: React.FC<HealthNavigationActivitiesProps> = ({ activities, setActivities, clients, hasUnreadSubmissions, onViewSubmissions, currentUser }) => {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [selectedActivity, setSelectedActivity] = useState<HealthActivity | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isViewOnly, setIsViewOnly] = useState(false);

  const isNavigator = currentUser?.role === 'navigator';

  const getClientName = (clientId: string) => {
      return clients.find(c => c.id === clientId)?.fullName || 'Unknown Client';
  }
  
  // Filter activities based on user role and ownership
  // NOTE: All users (including navigators) can now VIEW all activities
  // Edit permissions are controlled separately in the action buttons
  const userFilteredActivities = activities;
  
  const filteredActivities = userFilteredActivities.filter(activity => {
      const clientName = getClientName(activity.clientId).toLowerCase();
      const query = searchQuery.toLowerCase();
      const primaryActivity = (activity.navigationAssistance[0] || activity.servicesAccessed[0] || '').toLowerCase();
      
      return clientName.includes(query) || primaryActivity.includes(query);
  });

  const handleAddNew = () => {
    if (clients.length === 0) {
        alert("Please add a client first before creating a health activity.");
        return;
    }
    setSelectedActivity(null);
    setView('form');
  };

  const handleView = (activity: HealthActivity) => {
    setSelectedActivity(activity);
    setIsViewOnly(true);
    setView('form');
  };

  const handleEdit = (activity: HealthActivity) => {
    setSelectedActivity(activity);
    setIsViewOnly(false);
    setView('form');
  };
  
  const handleDelete = async (activityId: string) => {
    if (window.confirm('Are you sure you want to delete this activity?')) {
      try {
        await activityService.delete(activityId);
        setActivities(activities.filter(a => a.id !== activityId));
      } catch (error) {
        console.error('Error deleting activity:', error);
        alert('Failed to delete activity. Please try again.');
      }
    }
  };

  const handleSave = async (activity: HealthActivity) => {
    try {
      // Debug: Log the activity being saved
      console.log('Saving activity with multiple selections:', {
        navigationAssistance: activity.navigationAssistance,
        servicesAccessed: activity.servicesAccessed,
        educationalResources: activity.educationalResources,
        preventiveServices: activity.preventiveServices,
        maternalChildHealth: activity.maternalChildHealth
      });
      
    if (selectedActivity) {
        // Update existing activity in database
        await activityService.update(activity.id, activity);
      setActivities(activities.map(a => a.id === activity.id ? activity : a));
    } else {
        // Create new activity in database with creator tracking
        const newActivity = {
          ...activity,
          id: `A${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          // Track who created this activity
          createdBy: currentUser?.email || 'unknown@multinav.com',
          createdByName: currentUser?.name || 'Unknown User',
          createdByRole: currentUser?.role || 'navigator',
          createdAt: new Date().toISOString()
          // location is already in activity from the form
        };
        await activityService.create(newActivity);
        setActivities([...activities, newActivity]);
    }
    setView('list');
    setSelectedActivity(null);
    } catch (error: any) {
      console.error('Error saving activity:', error);
      const detail = error?.message || error?.details || error?.hint || 'Unknown error';
      alert(`Failed to save activity: ${detail}`);
    }
  };

  const handleCancel = () => {
    setView('list');
    setSelectedActivity(null);
    setIsViewOnly(false);
  };
  
  const handleDownloadCSV = () => {
    const headers = ["Activity ID", "Client Name", "Date", "Location", "Navigation Assistance", "Services Accessed", "Referrals Made", "Follow-up Actions", "Created By"];
    const csvRows = [
        headers.join(','),
        ...filteredActivities.map(a => [
            `"${a.id}"`,
            `"${getClientName(a.clientId)}"`,
            `"${a.date}"`,
            `"${a.location || 'Not specified'}"`,
            `"${a.navigationAssistance.join('; ')}"`,
            `"${a.servicesAccessed.join('; ')}"`,
            `"${a.referralsMade.replace(/"/g, '""')}"`,
            `"${a.followUpActions.replace(/"/g, '""')}"`,
            `"${a.createdByName || a.createdBy || 'Unknown'}"`
        ].join(','))
    ];
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', 'activities.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = () => {
      const doc = new jsPDF();
      const tableHead = [["Client", "Date", "Location", "Primary Activity", "Services Accessed"]];
      const tableBody = filteredActivities.map(a => [
          getClientName(a.clientId),
          a.date ? new Date(a.date).toLocaleDateString('en-AU') : 'N/A',
          a.location || 'Not specified',
          a.navigationAssistance.join(', ') || 'N/A',
          a.servicesAccessed.join(', ') || 'N/A'
      ]);

      (doc as any).autoTable({
          head: tableHead,
          body: tableBody,
          startY: 20,
          styles: { font: "helvetica", fontSize: 10 },
          headStyles: { fillColor: [132, 204, 22] }, // lime-green-500
          didDrawPage: (data: any) => {
              doc.setFontSize(18);
              doc.setTextColor(40);
              doc.text("Activity Log", data.settings.margin.left, 15);
          }
      });

      doc.save('activities.pdf');
  };

  if (view === 'form') {
    return (
      <ActivityForm
        initialActivity={selectedActivity}
        onSave={handleSave}
        onCancel={handleCancel}
        clients={clients}
        readOnly={isViewOnly}
      />
    );
  }

  return (
    <Card>
      <div className="flex justify-between items-start md:items-center mb-6 flex-col md:flex-row gap-4">
        <div className="flex-1 w-full md:w-auto">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Activity Log</h2>
            {/* Show whose activities are being displayed */}
            {currentUser?.role === 'navigator' && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Viewing all team activities (you can only edit your own)
                </p>
            )}
            {currentUser?.role === 'coordinator' && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Showing all team activities (Coordinator view)
                </p>
            )}
            {currentUser?.role === 'admin' && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Showing all activities (Admin view)
                </p>
            )}
            <div className="relative mt-2 max-w-sm">
                 <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    placeholder="Search by client, activity..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 pl-10 focus:border-lime-green-500 focus:ring-lime-green-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                />
            </div>
        </div>
        <div className="flex items-center gap-2">
            <button 
                onClick={onViewSubmissions}
                className="relative inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-baby-blue-500 hover:bg-baby-blue-400"
            >
                {hasUnreadSubmissions && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                )}
                <Bell className="mr-2 h-5 w-5" />
                View Patient Submissions
            </button>
            <button
                onClick={handleDownloadCSV}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-500 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none"
                title="Download as CSV"
            >
                <FileDown className="mr-2 h-4 w-4" /> CSV
            </button>
            <button
                onClick={handleDownloadPDF}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-500 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none"
                title="Download as PDF"
            >
                <FileDown className="mr-2 h-4 w-4" /> PDF
            </button>
            <button
            onClick={handleAddNew}
            disabled={clients.length === 0}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-lime-green-500 hover:bg-lime-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
            <Plus className="mr-2 h-5 w-5" />
            Log New Activity
            </button>
        </div>
      </div>

      <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-300">
                <tr>
                    <th scope="col" className="px-6 py-3">Client</th>
                    <th scope="col" className="px-6 py-3">Primary Activity</th>
                    <th scope="col" className="px-6 py-3">Date</th>
                    <th scope="col" className="px-6 py-3">Staff</th>
                    <th scope="col" className="px-6 py-3 text-right">Actions</th>
                </tr>
            </thead>
            <tbody>
                {filteredActivities.length > 0 ? filteredActivities.map(activity => (
                <tr key={activity.id} className="bg-white border-b dark:bg-gray-900 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                        {getClientName(activity.clientId)}
                    </th>
                    <td className="px-6 py-4">
                        <div className="space-y-1">
                            {activity.navigationAssistance.length > 0 && (
                                <div className="text-sm">
                                    <span className="font-medium">Navigation: </span>
                                    {activity.navigationAssistance.join(', ')}
                                </div>
                            )}
                            {activity.servicesAccessed.length > 0 && (
                                <div className="text-sm">
                                    <span className="font-medium">Services: </span>
                                    {activity.servicesAccessed.join(', ')}
                                </div>
                            )}
                            {activity.navigationAssistance.length === 0 && activity.servicesAccessed.length === 0 && (
                                <span className="text-gray-500">No activities recorded</span>
                            )}
                        </div>
                    </td>
                    <td className="px-6 py-4">{activity.date ? new Date(activity.date).toLocaleDateString('en-AU') : 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{activity.createdByName || activity.createdBy || '—'}</td>
                    <td className="px-6 py-4 text-right space-x-1">
                        {isNavigator ? (
                            <>
                                <button onClick={() => handleView(activity)} className="p-2 text-gray-500 hover:text-baby-blue-600 dark:hover:text-baby-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="View">
                                    <Eye className="h-5 w-5" />
                                </button>
                                {/* Navigators can only edit their own activities */}
                                {(activity.createdBy === currentUser?.email || activity.createdByName === currentUser?.name) && (
                                    <>
                                        <button onClick={() => handleEdit(activity)} className="p-2 text-gray-500 hover:text-lime-green-600 dark:hover:text-lime-green-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Edit">
                                            <Pencil className="h-5 w-5" />
                                        </button>
                                        <button onClick={() => handleDelete(activity.id)} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Delete">
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </>
                                )}
                            </>
                        ) : (
                            <>
                                <button onClick={() => handleView(activity)} className="p-2 text-gray-500 hover:text-baby-blue-600 dark:hover:text-baby-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="View">
                                    <Eye className="h-5 w-5" />
                                </button>
                                <button onClick={() => handleEdit(activity)} className="p-2 text-gray-500 hover:text-lime-green-600 dark:hover:text-lime-green-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Edit">
                                    <Pencil className="h-5 w-5" />
                                </button>
                                <button onClick={() => handleDelete(activity.id)} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Delete">
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            </>
                        )}
                    </td>
                </tr>
                )) : (
                    <tr>
                        <td colSpan={5} className="text-center py-10 text-gray-500 dark:text-gray-400">
                            {searchQuery ? 'No activities match your search.' : 'No activities logged. Add a new activity to get started.'}
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>
    </Card>
  );
};

export default HealthNavigationActivities;
