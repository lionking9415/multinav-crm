import React, { useState, useEffect, useMemo } from 'react';
import type { Client, PatientData, ChatMessage, ExperienceEntry } from '../types';
import { translateText } from '../services/geminiService';
import { X, BookUser, MessageSquare, Languages, Inbox, Paperclip } from 'lucide-react';

interface PatientSubmissionsViewerProps {
    isOpen: boolean;
    onClose: () => void;
    clients: Client[];
    patientData: Record<string, PatientData>;
    onMarkAsRead: (clientId: string) => void;
}

const PatientSubmissionsViewer: React.FC<PatientSubmissionsViewerProps> = ({ isOpen, onClose, clients, patientData, onMarkAsRead }) => {
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);

    const clientsWithSubmissions = useMemo(() => {
        return clients.filter(c => patientData[c.id] && (
            patientData[c.id].experiences.length > 0 ||
            patientData[c.id].messages.length > 0
        ));
    }, [clients, patientData]);
    
    const hasUnread = (clientId: string): boolean => {
        const data = patientData[clientId];
        if (!data) return false;
        return data.experiences.some(e => !e.isRead) ||
               data.messages.some(m => m.sender === 'patient' && !m.isRead);
    };

    useEffect(() => {
        if (!isOpen) {
            setSelectedClient(null);
        } else if (clientsWithSubmissions.length > 0 && !selectedClient) {
            // Auto-select the first client with unread messages, or just the first client
            const firstUnread = clientsWithSubmissions.find(c => hasUnread(c.id));
            const clientToSelect = firstUnread || clientsWithSubmissions[0];
            setSelectedClient(clientToSelect);
            onMarkAsRead(clientToSelect.id);
        }
    }, [isOpen, clientsWithSubmissions]);


    const handleSelectClient = (client: Client) => {
        setSelectedClient(client);
        if (hasUnread(client.id)) {
            onMarkAsRead(client.id);
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 transition-opacity duration-300">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
                <header className="flex justify-between items-center p-4 border-b dark:border-gray-700 flex-shrink-0">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Patient Submissions Portal</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <X className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                    </button>
                </header>
                <div className="flex flex-grow overflow-hidden">
                    {/* Client List Panel */}
                    <aside className="w-1/3 xl:w-1/4 border-r dark:border-gray-700 flex-shrink-0 overflow-y-auto">
                        <nav className="p-2">
                             {clientsWithSubmissions.map(client => (
                                <button
                                    key={client.id}
                                    onClick={() => handleSelectClient(client)}
                                    className={`w-full text-left p-3 my-1 rounded-md flex justify-between items-center transition-colors duration-150 ${
                                        selectedClient?.id === client.id
                                            ? 'bg-lime-green-100 dark:bg-lime-green-900/50'
                                            : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'
                                    }`}
                                >
                                    <div>
                                        <p className={`font-medium ${selectedClient?.id === client.id ? 'text-lime-green-800 dark:text-lime-green-200' : 'text-gray-800 dark:text-gray-100'}`}>{client.fullName}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{client.id}</p>
                                    </div>
                                    {hasUnread(client.id) && <span className="w-2.5 h-2.5 bg-baby-blue-500 rounded-full flex-shrink-0 ml-2" title="New Submissions"></span>}
                                </button>
                            ))}
                        </nav>
                    </aside>
                    {/* Content Panel */}
                    <main className="flex-1 overflow-y-auto">
                       {selectedClient && patientData[selectedClient.id] ? (
                            <SubmissionsContent client={selectedClient} data={patientData[selectedClient.id]} />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                                <Inbox className="h-16 w-16 mb-4" />
                                <h3 className="text-lg font-medium">No Client Selected</h3>
                                <p>Select a client from the list to view their submissions.</p>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
};

const SubmissionsContent = ({ client, data }: { client: Client, data: PatientData }) => {
    const [activeTab, setActiveTab] = useState('experience');

    const TabButton = ({ id, label, icon, count }: { id: string; label: string; icon: React.ReactNode, count: number }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center p-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === id
                    ? 'border-lime-green-500 text-lime-green-600 dark:text-lime-green-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
        >
            {icon}
            <span className="ml-2">{label}</span>
            {count > 0 && <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-200 rounded-full px-2 py-0.5">{count}</span>}
        </button>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'experience': return <ExperienceView entries={data.experiences} />;
            case 'messages': return <MessagesView messages={data.messages} client={client}/>;
            default: return null;
        }
    }
    
    return (
        <div className="p-6">
            <header className="mb-4">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{client.fullName}'s Submissions</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Client ID: {client.id} &bull; Primary Language: {client.languages[0] || 'N/A'}</p>
            </header>
            <nav className="flex border-b dark:border-gray-700 space-x-4">
                <TabButton id="experience" label="Experience Journal" icon={<BookUser size={16}/>} count={data.experiences.length} />
                <TabButton id="messages" label="Messages" icon={<MessageSquare size={16}/>} count={data.messages.length} />
            </nav>
            <div className="mt-6">
                {renderContent()}
            </div>
        </div>
    );
};

const ExperienceView: React.FC<{ entries: ExperienceEntry[] }> = ({ entries }) => (
    <div className="space-y-4">
        {entries.length > 0 ? [...entries].reverse().map(entry => (
             <div key={entry.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-md border-l-4 border-baby-blue-300 dark:border-baby-blue-600">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{new Date(entry.date).toLocaleString()}</p>
                <p className="text-gray-800 dark:text-gray-200 mt-1 whitespace-pre-wrap">{entry.content}</p>
                {entry.attachments && entry.attachments.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                        <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Attachments:</h4>
                        <ul className="space-y-1">
                            {entry.attachments.map((file, index) => (
                                <li key={index}>
                                    <a href={file.data} download={file.name} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm text-baby-blue-600 dark:text-baby-blue-400 hover:underline">
                                        <Paperclip size={14} className="mr-1" /> {file.name}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        )) : <p className="text-gray-500 dark:text-gray-400">No journal entries from this client.</p>}
    </div>
);

const MessagesView: React.FC<{ messages: ChatMessage[], client: Client }> = ({ messages, client }) => {
    const [isTranslating, setIsTranslating] = useState(false);
    
    const handleTranslate = async (text: string) => {
        setIsTranslating(true);
        try {
            const translatedText = await translateText(text, "English");
            alert(`Translation to English:\n\n${translatedText}`);
        } catch (error) {
             alert(`Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsTranslating(false);
        }
    };

    return (
        <div className="space-y-4">
             {messages.map(msg => (
                <div key={msg.id} className={`flex items-start gap-3 ${msg.sender === 'patient' ? '' : 'flex-row-reverse'}`}>
                    <div className={`p-3 rounded-lg max-w-lg ${msg.sender === 'patient' ? 'bg-baby-blue-100 dark:bg-baby-blue-900/50' : 'bg-lime-green-100 dark:bg-lime-green-900/50'}`}>
                        <p className="text-gray-800 dark:text-gray-100">{msg.text}</p>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex justify-between items-center">
                            <span>{new Date(msg.timestamp).toLocaleString()}</span>
                            {msg.sender === 'patient' && msg.language !== 'English' && (
                                <button onClick={() => handleTranslate(msg.text)} disabled={isTranslating} className="ml-3 inline-flex items-center text-baby-blue-600 dark:text-baby-blue-400 hover:underline disabled:opacity-50">
                                    <Languages size={14} className="mr-1"/> Translate
                                </button>
                            )}
                        </div>
                    </div>
                     <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center font-bold text-gray-600 dark:text-gray-200 text-sm flex-shrink-0" title={msg.sender === 'patient' ? client.fullName : 'Navigator'}>
                        {msg.sender === 'patient' ? client.fullName.charAt(0) : 'N'}
                    </div>
                </div>
            ))}
            {messages.length === 0 && <p className="text-gray-500 dark:text-gray-400">No messages exchanged with this client.</p>}
        </div>
    );
};

export default PatientSubmissionsViewer;