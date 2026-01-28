import React, { useState } from 'react';
import type { CommunityEngagement } from '../types';
import Card from './Card';
import { communityEngagementService } from '../services/supabaseService';
import { Plus, Trash2, Pencil, FileDown, Search, X, Calendar, Building2, Users, FileText, Home, Globe } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface CommunityEngagementRegisterProps {
  engagements: CommunityEngagement[];
  setEngagements: React.Dispatch<React.SetStateAction<CommunityEngagement[]>>;
  currentUser?: {
    email: string;
    role: 'admin' | 'coordinator' | 'navigator';
    name: string;
  };
}

const CommunityEngagementRegister: React.FC<CommunityEngagementRegisterProps> = ({ 
  engagements, 
  setEngagements, 
  currentUser 
}) => {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [selectedEngagement, setSelectedEngagement] = useState<CommunityEngagement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    dateOfMeeting: '',
    agencyType: 'external' as 'internal' | 'external',
    agencyName: '',
    staffPresent: '',
    meetingNotes: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  // Filter engagements based on user role and ownership
  const userFilteredEngagements = engagements.filter(engagement => {
    // Admins and coordinators can see all engagements
    if (currentUser?.role === 'admin' || currentUser?.role === 'coordinator') {
      return true;
    }
    
    // Navigators can only see their own engagements
    if (currentUser?.role === 'navigator') {
      return engagement.createdBy === currentUser.email || 
             engagement.createdByName === currentUser.name ||
             (!engagement.createdBy && !engagement.createdByName);
    }
    
    return true;
  });
  
  const filteredEngagements = userFilteredEngagements.filter(engagement => {
    const query = searchQuery.toLowerCase();
    return (
      engagement.agencyName.toLowerCase().includes(query) ||
      engagement.staffPresent.toLowerCase().includes(query) ||
      engagement.meetingNotes.toLowerCase().includes(query)
    );
  });

  const handleAddNew = () => {
    setSelectedEngagement(null);
    setFormData({
      dateOfMeeting: new Date().toISOString().split('T')[0],
      agencyType: 'external',
      agencyName: '',
      staffPresent: '',
      meetingNotes: ''
    });
    setView('form');
  };

  const handleEdit = (engagement: CommunityEngagement) => {
    setSelectedEngagement(engagement);
    setFormData({
      dateOfMeeting: engagement.dateOfMeeting,
      agencyType: engagement.agencyType || 'external',
      agencyName: engagement.agencyName,
      staffPresent: engagement.staffPresent,
      meetingNotes: engagement.meetingNotes
    });
    setView('form');
  };
  
  const handleDelete = async (engagementId: string) => {
    if (window.confirm('Are you sure you want to delete this engagement record?')) {
      try {
        await communityEngagementService.delete(engagementId);
        setEngagements(engagements.filter(e => e.id !== engagementId));
      } catch (error) {
        console.error('Error deleting engagement:', error);
        alert('Failed to delete engagement. Please try again.');
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.dateOfMeeting || !formData.agencyName) {
      alert('Please fill in the required fields (Date and Agency Name)');
      return;
    }

    setIsSaving(true);
    
    try {
      if (selectedEngagement) {
        // Update existing engagement
        const updatedEngagement = await communityEngagementService.update(selectedEngagement.id, formData);
        setEngagements(engagements.map(e => e.id === selectedEngagement.id ? { ...e, ...formData } : e));
      } else {
        // Create new engagement
        const newEngagement: CommunityEngagement = {
          ...formData,
          id: `CE${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          createdBy: currentUser?.email || 'unknown@multinav.com',
          createdByName: currentUser?.name || 'Unknown User',
          createdByRole: currentUser?.role || 'navigator',
          createdAt: new Date().toISOString()
        };
        await communityEngagementService.create(newEngagement);
        setEngagements([newEngagement, ...engagements]);
      }
      setView('list');
      setSelectedEngagement(null);
    } catch (error) {
      console.error('Error saving engagement:', error);
      alert('Failed to save engagement. Please check your database connection.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setView('list');
    setSelectedEngagement(null);
  };
  
  const handleDownloadCSV = () => {
    const headers = ["ID", "Date of Meeting/Event", "Agency Type", "Agency Name", "Staff Present", "Meeting Notes", "Created By", "Created At"];
    const csvRows = [
      headers.join(','),
      ...filteredEngagements.map(e => [
        `"${e.id}"`,
        `"${e.dateOfMeeting}"`,
        `"${e.agencyType === 'internal' ? 'Internal' : 'External'}"`,
        `"${e.agencyName.replace(/"/g, '""')}"`,
        `"${e.staffPresent.replace(/"/g, '""')}"`,
        `"${e.meetingNotes.replace(/"/g, '""')}"`,
        `"${e.createdByName || e.createdBy || 'Unknown'}"`,
        `"${e.createdAt ? new Date(e.createdAt).toLocaleDateString() : 'N/A'}"`
      ].join(','))
    ];
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', 'community_engagements.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const tableHead = [["Date", "Type", "Agency Name", "Staff Present", "Notes"]];
    const tableBody = filteredEngagements.map(e => [
      e.dateOfMeeting ? new Date(e.dateOfMeeting).toLocaleDateString() : 'N/A',
      e.agencyType === 'internal' ? 'Internal' : 'External',
      e.agencyName || 'N/A',
      e.staffPresent || 'N/A',
      e.meetingNotes.length > 40 ? e.meetingNotes.substring(0, 40) + '...' : e.meetingNotes || 'N/A'
    ]);

    (doc as any).autoTable({
      head: tableHead,
      body: tableBody,
      startY: 20,
      styles: { font: "helvetica", fontSize: 10 },
      headStyles: { fillColor: [132, 204, 22] }, // lime-green-500
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 45 },
        2: { cellWidth: 45 },
        3: { cellWidth: 65 }
      },
      didDrawPage: (data: any) => {
        doc.setFontSize(18);
        doc.setTextColor(40);
        doc.text("Community Engagement Register", data.settings.margin.left, 15);
      }
    });

    doc.save('community_engagements.pdf');
  };

  // Form View
  if (view === 'form') {
    return (
      <Card>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            {selectedEngagement ? 'Edit Engagement' : 'Log New Community Engagement'}
          </h2>
          <button
            onClick={handleCancel}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Date of Meeting/Event */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="w-4 h-4 mr-2 text-lime-green-500" />
              Date of Meeting/Event <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="date"
              value={formData.dateOfMeeting}
              onChange={(e) => setFormData({ ...formData, dateOfMeeting: e.target.value })}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          {/* Agency Type */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Building2 className="w-4 h-4 mr-2 text-lime-green-500" />
              Agency Type <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, agencyType: 'internal' })}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                  formData.agencyType === 'internal'
                    ? 'border-lime-green-500 bg-lime-green-50 dark:bg-lime-green-900/30 text-lime-green-700 dark:text-lime-green-300'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <Home className={`w-5 h-5 ${formData.agencyType === 'internal' ? 'text-lime-green-600' : 'text-gray-500'}`} />
                <span className="font-medium">Internal Agency</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, agencyType: 'external' })}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                  formData.agencyType === 'external'
                    ? 'border-baby-blue-500 bg-baby-blue-50 dark:bg-baby-blue-900/30 text-baby-blue-700 dark:text-baby-blue-300'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <Globe className={`w-5 h-5 ${formData.agencyType === 'external' ? 'text-baby-blue-600' : 'text-gray-500'}`} />
                <span className="font-medium">External Agency</span>
              </button>
            </div>
          </div>

          {/* Agency Name */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Building2 className="w-4 h-4 mr-2 text-lime-green-500" />
              Agency Name <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              value={formData.agencyName}
              onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
              placeholder="Enter agency or organization name"
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          {/* Staff Present */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Users className="w-4 h-4 mr-2 text-lime-green-500" />
              Staff Present
            </label>
            <input
              type="text"
              value={formData.staffPresent}
              onChange={(e) => setFormData({ ...formData, staffPresent: e.target.value })}
              placeholder="Enter names of staff who attended"
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Meeting Notes */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FileText className="w-4 h-4 mr-2 text-lime-green-500" />
              Meeting Notes
            </label>
            <textarea
              value={formData.meetingNotes}
              onChange={(e) => setFormData({ ...formData, meetingNotes: e.target.value })}
              placeholder="Enter meeting notes, discussion points, action items..."
              rows={6}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-green-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-lime-green-500 hover:bg-lime-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : (selectedEngagement ? 'Update Engagement' : 'Save Engagement')}
            </button>
          </div>
        </form>
      </Card>
    );
  }

  // List View
  return (
    <Card>
      <div className="flex justify-between items-start md:items-center mb-6 flex-col md:flex-row gap-4">
        <div className="flex-1 w-full md:w-auto">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Community Engagement Register</h2>
          {/* Show whose engagements are being displayed */}
          {currentUser?.role === 'navigator' && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Showing your engagements only
            </p>
          )}
          {currentUser?.role === 'coordinator' && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Showing all team engagements (Coordinator view)
            </p>
          )}
          {currentUser?.role === 'admin' && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Showing all engagements (Admin view)
            </p>
          )}
          <div className="relative mt-2 max-w-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by agency, staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 pl-10 focus:border-lime-green-500 focus:ring-lime-green-500 sm:text-sm dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
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
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-lime-green-500 hover:bg-lime-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-green-500"
          >
            <Plus className="mr-2 h-5 w-5" />
            Log New Engagement
          </button>
        </div>
      </div>

      <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-300">
            <tr>
              <th scope="col" className="px-6 py-3">Date</th>
              <th scope="col" className="px-6 py-3">Type</th>
              <th scope="col" className="px-6 py-3">Agency Name</th>
              <th scope="col" className="px-6 py-3">Staff Present</th>
              <th scope="col" className="px-6 py-3">Meeting Notes</th>
              <th scope="col" className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEngagements.length > 0 ? filteredEngagements.map(engagement => (
              <tr key={engagement.id} className="bg-white border-b dark:bg-gray-900 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                  {engagement.dateOfMeeting ? new Date(engagement.dateOfMeeting).toLocaleDateString() : 'N/A'}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    engagement.agencyType === 'internal' 
                      ? 'bg-lime-green-100 text-lime-green-700 dark:bg-lime-green-900/50 dark:text-lime-green-300'
                      : 'bg-baby-blue-100 text-baby-blue-700 dark:bg-baby-blue-900/50 dark:text-baby-blue-300'
                  }`}>
                    {engagement.agencyType === 'internal' ? <Home className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                    {engagement.agencyType === 'internal' ? 'Internal' : 'External'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="font-medium text-gray-900 dark:text-white">{engagement.agencyName}</span>
                </td>
                <td className="px-6 py-4">
                  {engagement.staffPresent || <span className="text-gray-400">Not specified</span>}
                </td>
                <td className="px-6 py-4">
                  <div className="max-w-xs truncate" title={engagement.meetingNotes}>
                    {engagement.meetingNotes || <span className="text-gray-400">No notes</span>}
                  </div>
                </td>
                <td className="px-6 py-4 text-right space-x-1">
                  {/* Only show edit/delete if user owns the engagement or is admin/coordinator */}
                  {(currentUser?.role === 'admin' || 
                    currentUser?.role === 'coordinator' ||
                    engagement.createdBy === currentUser?.email ||
                    engagement.createdByName === currentUser?.name ||
                    !engagement.createdBy) && (
                    <>
                      <button 
                        onClick={() => handleEdit(engagement)} 
                        className="p-2 text-gray-500 hover:text-lime-green-600 dark:hover:text-lime-green-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(engagement.id)} 
                        className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </>
                  )}
                  {/* Show who created this if not the current user */}
                  {currentUser?.role === 'navigator' && 
                   engagement.createdBy !== currentUser?.email && 
                   engagement.createdBy && (
                    <span className="text-xs text-gray-400">
                      Created by {engagement.createdByName || engagement.createdBy}
                    </span>
                  )}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-500 dark:text-gray-400">
                  {searchQuery ? 'No engagements match your search.' : 'No engagements recorded. Add a new engagement to get started.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default CommunityEngagementRegister;
