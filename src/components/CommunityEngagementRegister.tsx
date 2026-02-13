import React, { useState } from 'react';
import type { CommunityEngagement } from '../types';
import Card from './Card';
import { communityEngagementService } from '../services/supabaseService';
import { Plus, Trash2, Pencil, FileDown, Search, X, Calendar, Building2, Users, FileText, Home, Globe, Eye } from 'lucide-react';
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
  const [isViewOnly, setIsViewOnly] = useState(false);

  const isNavigator = currentUser?.role === 'navigator';

  // All users can see all engagements
  const filteredEngagements = engagements.filter(engagement => {
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

  const handleView = (engagement: CommunityEngagement) => {
    setSelectedEngagement(engagement);
    setFormData({
      dateOfMeeting: engagement.dateOfMeeting,
      agencyType: engagement.agencyType || 'external',
      agencyName: engagement.agencyName,
      staffPresent: engagement.staffPresent,
      meetingNotes: engagement.meetingNotes
    });
    setIsViewOnly(true);
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
    setIsViewOnly(false);
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
    setIsViewOnly(false);
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
    // Use landscape orientation for better layout
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Title
    doc.setFontSize(20);
    doc.setTextColor(40);
    doc.text("Community Engagement Register", pageWidth / 2, 15, { align: 'center' });
    
    // Subtitle with date range
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString()} | Total Records: ${filteredEngagements.length}`, pageWidth / 2, 22, { align: 'center' });

    const tableHead = [["Date", "Type", "Agency Name", "Staff Present", "Meeting Notes"]];
    const tableBody = filteredEngagements.map(e => [
      e.dateOfMeeting ? new Date(e.dateOfMeeting).toLocaleDateString() : 'N/A',
      e.agencyType === 'internal' ? 'Internal' : 'External',
      e.agencyName || 'N/A',
      e.staffPresent || 'N/A',
      e.meetingNotes || 'N/A'
    ]);

    (doc as any).autoTable({
      head: tableHead,
      body: tableBody,
      startY: 28,
      styles: { 
        font: "helvetica", 
        fontSize: 9,
        cellPadding: 4,
        overflow: 'linebreak',
        valign: 'top'
      },
      headStyles: { 
        fillColor: [132, 204, 22], // lime-green-500
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 25, halign: 'center' },  // Date
        1: { cellWidth: 22, halign: 'center' },  // Type
        2: { cellWidth: 55 },                     // Agency Name
        3: { cellWidth: 50 },                     // Staff Present
        4: { cellWidth: 'auto' }                  // Meeting Notes - takes remaining space
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      didDrawPage: (data: any) => {
        // Footer with page numbers
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }
    });

    doc.save('community_engagements.pdf');
  };

  const handleDownloadWord = () => {
    const generatedDate = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
    
    // Count by type
    const internalCount = filteredEngagements.filter(e => e.agencyType === 'internal').length;
    const externalCount = filteredEngagements.filter(e => e.agencyType === 'external').length;

    // Word document with landscape orientation and PDF-like styling
    const styles = `<style>
      @page { size: landscape; margin: 1cm; }
      body { font-family: Calibri, Arial, sans-serif; font-size: 10pt; line-height: 1.4; color: #333; }
      h1 { font-size: 20pt; text-align: center; color: #2c5282; margin-bottom: 5px; border-bottom: 3px solid #84cc16; padding-bottom: 10px; }
      .subtitle { text-align: center; color: #666; font-size: 10pt; margin-bottom: 15px; }
      .summary-row { display: flex; justify-content: center; gap: 40px; margin-bottom: 20px; padding: 10px; background-color: #f8fafc; border-radius: 5px; }
      .summary-item { text-align: center; }
      .summary-value { font-size: 18pt; font-weight: bold; color: #84cc16; }
      .summary-label { font-size: 9pt; color: #666; }
      table { border-collapse: collapse; width: 100%; margin-top: 10px; font-size: 9pt; }
      th { background-color: #84cc16; color: white; font-weight: bold; padding: 8px 6px; text-align: left; border: 1px solid #6aa313; }
      td { border: 1px solid #d1d5db; padding: 8px 6px; vertical-align: top; }
      tr:nth-child(even) { background-color: #f9fafb; }
      tr:hover { background-color: #f0fdf4; }
      .col-date { width: 70px; text-align: center; }
      .col-type { width: 60px; text-align: center; }
      .col-agency { width: 140px; }
      .col-staff { width: 120px; }
      .col-notes { width: auto; }
      .type-internal { background-color: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 3px; font-size: 8pt; }
      .type-external { background-color: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 3px; font-size: 8pt; }
      .footer { text-align: center; font-size: 8pt; color: #888; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 8px; }
      .page-number { text-align: right; font-size: 8pt; color: #999; }
    </style>`;

    let content = `
      <h1>Community Engagement Register</h1>
      <p class="subtitle">Generated: ${generatedDate} | Total Records: ${filteredEngagements.length}</p>
      
      <table style="width: auto; margin: 0 auto 20px auto; border: none;">
        <tr style="background: none;">
          <td style="border: none; text-align: center; padding: 10px 30px;">
            <div class="summary-value">${filteredEngagements.length}</div>
            <div class="summary-label">Total Engagements</div>
          </td>
          <td style="border: none; text-align: center; padding: 10px 30px;">
            <div class="summary-value" style="color: #16a34a;">${internalCount}</div>
            <div class="summary-label">Internal</div>
          </td>
          <td style="border: none; text-align: center; padding: 10px 30px;">
            <div class="summary-value" style="color: #2563eb;">${externalCount}</div>
            <div class="summary-label">External</div>
          </td>
        </tr>
      </table>
    `;

    // Engagements table - matching PDF layout
    content += `<table>
      <tr>
        <th class="col-date">Date</th>
        <th class="col-type">Type</th>
        <th class="col-agency">Agency Name</th>
        <th class="col-staff">Staff Present</th>
        <th class="col-notes">Meeting Notes</th>
      </tr>`;
    
    filteredEngagements.forEach(e => {
      const typeClass = e.agencyType === 'internal' ? 'type-internal' : 'type-external';
      const typeLabel = e.agencyType === 'internal' ? 'Internal' : 'External';
      const notes = (e.meetingNotes || 'N/A').replace(/\n/g, '<br>');
      content += `
        <tr>
          <td class="col-date">${e.dateOfMeeting ? new Date(e.dateOfMeeting).toLocaleDateString() : 'N/A'}</td>
          <td class="col-type"><span class="${typeClass}">${typeLabel}</span></td>
          <td class="col-agency"><strong>${e.agencyName || 'N/A'}</strong></td>
          <td class="col-staff">${e.staffPresent || '-'}</td>
          <td class="col-notes">${notes}</td>
        </tr>
      `;
    });
    content += `</table>`;

    // Footer with page info
    content += `<div class="footer">
      <p>Community Engagement Register | MultiNav iCRM | Generated: ${generatedDate}</p>
    </div>`;

    const source = `data:application/vnd.ms-word;charset=utf-8,${encodeURIComponent(`<html><head><meta charset="UTF-8">${styles}</head><body>${content}</body></html>`)}`;
    const link = document.createElement("a");
    link.href = source;
    link.download = `Community_Engagement_Register_${new Date().toISOString().split('T')[0]}.doc`;
    link.click();
  };

  // Form View
  if (view === 'form') {
    return (
      <Card>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            {isViewOnly ? 'View Engagement' : (selectedEngagement ? 'Edit Engagement' : 'Log New Community Engagement')}
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
              disabled={isViewOnly}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
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
                onClick={() => !isViewOnly && setFormData({ ...formData, agencyType: 'internal' })}
                disabled={isViewOnly}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
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
                onClick={() => !isViewOnly && setFormData({ ...formData, agencyType: 'external' })}
                disabled={isViewOnly}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
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
              disabled={isViewOnly}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
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
              disabled={isViewOnly}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
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
              disabled={isViewOnly}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-green-500"
            >
              {isViewOnly ? 'Back' : 'Cancel'}
            </button>
            {!isViewOnly && (
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-lime-green-500 hover:bg-lime-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : (selectedEngagement ? 'Update Engagement' : 'Save Engagement')}
              </button>
            )}
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
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Showing all engagements
          </p>
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
        <div className="flex items-center gap-2 flex-wrap">
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
            onClick={handleDownloadWord}
            className="inline-flex items-center px-3 py-2 border border-blue-300 dark:border-blue-500 text-sm font-medium rounded-md shadow-sm text-blue-700 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-800/50 focus:outline-none"
            title="Download as Word Document"
          >
            <FileText className="mr-2 h-4 w-4" /> Word
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
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 table-fixed">
          <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-300">
            <tr>
              <th scope="col" className="px-3 py-3 w-24">Date</th>
              <th scope="col" className="px-3 py-3 w-24">Type</th>
              <th scope="col" className="px-3 py-3 w-36">Agency Name</th>
              <th scope="col" className="px-3 py-3 w-32">Staff Present</th>
              <th scope="col" className="px-3 py-3">Meeting Notes</th>
              <th scope="col" className="px-3 py-3 w-28">Registered By</th>
              <th scope="col" className="px-3 py-3 w-20 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEngagements.length > 0 ? filteredEngagements.map(engagement => (
              <tr key={engagement.id} className="bg-white border-b dark:bg-gray-900 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-3 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white text-xs">
                  {engagement.dateOfMeeting ? new Date(engagement.dateOfMeeting).toLocaleDateString() : 'N/A'}
                </td>
                <td className="px-3 py-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    engagement.agencyType === 'internal' 
                      ? 'bg-lime-green-100 text-lime-green-700 dark:bg-lime-green-900/50 dark:text-lime-green-300'
                      : 'bg-baby-blue-100 text-baby-blue-700 dark:bg-baby-blue-900/50 dark:text-baby-blue-300'
                  }`}>
                    {engagement.agencyType === 'internal' ? <Home className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                    {engagement.agencyType === 'internal' ? 'Int' : 'Ext'}
                  </span>
                </td>
                <td className="px-3 py-4">
                  <span className="font-medium text-gray-900 dark:text-white text-xs">{engagement.agencyName}</span>
                </td>
                <td className="px-3 py-4 text-xs">
                  {engagement.staffPresent || <span className="text-gray-400">-</span>}
                </td>
                <td className="px-3 py-4">
                  <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {engagement.meetingNotes || <span className="text-gray-400">No notes</span>}
                  </div>
                </td>
                <td className="px-3 py-4 text-xs text-gray-700 dark:text-gray-300">
                  {engagement.createdByName || engagement.createdBy || <span className="text-gray-400">—</span>}
                </td>
                <td className="px-3 py-4 text-right">
                  <div className="flex justify-end gap-1">
                    {isNavigator ? (
                      <button 
                        onClick={() => handleView(engagement)} 
                        className="p-1 text-gray-500 hover:text-baby-blue-600 dark:hover:text-baby-blue-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    ) : (
                      <>
                        <button 
                          onClick={() => handleView(engagement)} 
                          className="p-1 text-gray-500 hover:text-baby-blue-600 dark:hover:text-baby-blue-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleEdit(engagement)} 
                          className="p-1 text-gray-500 hover:text-lime-green-600 dark:hover:text-lime-green-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(engagement.id)} 
                          className="p-1 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="text-center py-10 text-gray-500 dark:text-gray-400">
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
