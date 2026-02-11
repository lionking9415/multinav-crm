
import React, { useState } from 'react';
import type { Client, User } from '../types';
import { clientService } from '../services/supabaseService';
import Card from './Card';
import ClientForm from './ClientForm';
import { Plus, Trash2, Pencil, FileDown, Search, Eye } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';


interface ClientDemographicsProps {
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  users: User[];
  currentUser?: {
    email: string;
    role: 'admin' | 'coordinator' | 'navigator';
    name: string;
  };
}

const ClientDemographics: React.FC<ClientDemographicsProps> = ({ clients, setClients, users, currentUser }) => {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isViewOnly, setIsViewOnly] = useState(false);

  const isNavigator = currentUser?.role === 'navigator';

  const handleAddNew = () => {
    setSelectedClient(null);
    setView('form');
  };

  const handleView = (client: Client) => {
    setSelectedClient(client);
    setIsViewOnly(true);
    setView('form');
  };

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setIsViewOnly(false);
    setView('form');
  };

  const handleDelete = async (clientId: string) => {
    if (window.confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      try {
        await clientService.delete(clientId);
        setClients(clients.filter(c => c.id !== clientId));
      } catch (error) {
        console.error('Error deleting client:', error);
        alert('Failed to delete client. Please try again.');
      }
    }
  };

  const handleSave = async (client: Client) => {
    try {
      if (selectedClient) {
        // Update existing client in database
        await clientService.update(client.id, client);
        setClients(clients.map(c => c.id === client.id ? client : c));
      } else {
        // Add new client with a short, random alphanumeric ID and password
        const newId = `C${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const newPassword = `pass${Math.random().toString(36).substring(2, 6)}`;
        const newClient = { ...client, id: newId, password: newPassword };
        
        // Save to database
        await clientService.create(newClient);
        setClients([...clients, newClient]);
        
        alert(`New client created. Their login password is: ${newPassword}\nPlease record this password securely.`);
      }
      setView('list');
      setSelectedClient(null);
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Failed to save client. Please check your database connection.');
    }
  };

  const handleCancel = () => {
    setView('list');
    setSelectedClient(null);
    setIsViewOnly(false);
  };
  
  const filteredClients = clients.filter(client =>
    client.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.ethnicity.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.countryOfBirth.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.languages.some(lang => lang.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleDownloadCSV = () => {
    const headers = ["ID", "Full Name", "Sex", "Date of Birth", "Age", "Ethnicity", "Country of Birth", "Languages", "Referral Source", "Referral Date", "Assigned Staff"];
    const csvRows = [
        headers.join(','),
        ...filteredClients.map(c => [
            `"${c.id}"`,
            `"${c.fullName}"`,
            `"${c.sex}"`,
            `"${c.dob}"`,
            c.age,
            `"${c.ethnicity}"`,
            `"${c.countryOfBirth}"`,
            `"${c.languages.join('; ')}"`,
            `"${c.referralSource}"`,
            `"${c.referralDate}"`,
            `"${getAssignedStaffName(c.assignedStaffId)}"`
        ].join(','))
    ];
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', 'clients.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = () => {
      const doc = new jsPDF();
      const tableHead = [["ID", "Full Name", "Age", "Ethnicity", "Referral Source", "Referral Date", "Assigned Staff"]];
      const tableBody = filteredClients.map(c => [
          c.id,
          c.fullName,
          c.age,
          c.ethnicity,
          c.referralSource,
          c.referralDate ? new Date(c.referralDate).toLocaleDateString() : 'N/A',
          getAssignedStaffName(c.assignedStaffId)
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
              doc.text("Client List", data.settings.margin.left, 15);
          }
      });

      doc.save('clients.pdf');
  };

  const getAssignedStaffName = (assignedStaffId?: string) => {
    if (!assignedStaffId) return '—';
    const user = users.find(u => u.id === assignedStaffId);
    return user ? (user.fullName || user.email) : assignedStaffId;
  };

  if (view === 'form') {
    return (
      <ClientForm
        initialClient={selectedClient}
        users={users}
        onSave={handleSave}
        onCancel={handleCancel}
        readOnly={isViewOnly}
      />
    );
  }

  return (
    <Card>
      <div className="flex justify-between items-start md:items-center mb-6 flex-col md:flex-row gap-4">
         <div className="flex-1 w-full md:w-auto">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Client List</h2>
            <div className="relative mt-2 max-w-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                type="text"
                placeholder="Search by ID, name, etc..."
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
            Add New Client
            </button>
        </div>
      </div>

      <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-300">
                <tr>
                    <th scope="col" className="px-6 py-3">Client ID</th>
                    <th scope="col" className="px-6 py-3">Full Name</th>
                    <th scope="col" className="px-6 py-3">Age</th>
                    <th scope="col" className="px-6 py-3">Ethnicity</th>
                    <th scope="col" className="px-6 py-3">Languages</th>
                    <th scope="col" className="px-6 py-3">Referral Date</th>
                    <th scope="col" className="px-6 py-3">Assigned Staff</th>
                    <th scope="col" className="px-6 py-3 text-right">Actions</th>
                </tr>
            </thead>
            <tbody>
                {filteredClients.length > 0 ? filteredClients.map(client => (
                <tr key={client.id} className="bg-white border-b dark:bg-gray-900 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4">
                        <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">{client.id}</span>
                    </td>
                    <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                        {client.fullName}
                    </th>
                    <td className="px-6 py-4">{client.age}</td>
                    <td className="px-6 py-4">{client.ethnicity}</td>
                    <td className="px-6 py-4">{client.languages.join(', ')}</td>
                    <td className="px-6 py-4">{client.referralDate ? new Date(client.referralDate).toLocaleDateString() : 'N/A'}</td>
                    <td className="px-6 py-4">{getAssignedStaffName(client.assignedStaffId)}</td>
                    <td className="px-6 py-4 text-right space-x-1">
                    {isNavigator ? (
                      <button onClick={() => handleView(client)} className="p-2 text-gray-500 hover:text-baby-blue-600 dark:hover:text-baby-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="View">
                          <Eye className="h-5 w-5" />
                      </button>
                    ) : (
                      <>
                        <button onClick={() => handleView(client)} className="p-2 text-gray-500 hover:text-baby-blue-600 dark:hover:text-baby-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="View">
                            <Eye className="h-5 w-5" />
                        </button>
                        <button onClick={() => handleEdit(client)} className="p-2 text-gray-500 hover:text-lime-green-600 dark:hover:text-lime-green-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Edit">
                            <Pencil className="h-5 w-5" />
                        </button>
                        <button onClick={() => handleDelete(client.id)} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Delete">
                            <Trash2 className="h-5 w-5" />
                        </button>
                      </>
                    )}
                    </td>
                </tr>
                )) : (
                    <tr>
                        <td colSpan={8} className="text-center py-10 text-gray-500 dark:text-gray-400">
                           {searchQuery ? 'No clients match your search.' : 'No clients found. Add a new client to get started.'}
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>
    </Card>
  );
};

export default ClientDemographics;
