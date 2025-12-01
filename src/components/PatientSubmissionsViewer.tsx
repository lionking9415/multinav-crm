import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Client, PatientData, ChatMessage, ExperienceEntry } from '../types';
import { translateText } from '../services/geminiService';
import { X, BookUser, MessageSquare, Languages, Inbox, Paperclip, Globe, Loader2, RefreshCw, AlertCircle } from 'lucide-react';

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
            case 'experience': return <ExperienceView entries={data.experiences} clientLanguage={client.languages[0]} />;
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

const ExperienceView: React.FC<{ entries: ExperienceEntry[], clientLanguage?: string }> = ({ entries, clientLanguage }) => {
    const [translations, setTranslations] = useState<Record<string, { text: string; status: 'loading' | 'success' | 'error' }>>({});

    const translateEntry = useCallback(async (entryId: string, text: string) => {
        // Check cache first
        const cacheKey = `${text}_English`;
        if (translationCache.has(cacheKey)) {
            setTranslations(prev => ({
                ...prev,
                [entryId]: { text: translationCache.get(cacheKey)!, status: 'success' }
            }));
            return;
        }

        setTranslations(prev => ({
            ...prev,
            [entryId]: { text: '', status: 'loading' }
        }));

        try {
            const translatedText = await translateText(text, "English");
            translationCache.set(cacheKey, translatedText);
            setTranslations(prev => ({
                ...prev,
                [entryId]: { text: translatedText, status: 'success' }
            }));
        } catch (error) {
            setTranslations(prev => ({
                ...prev,
                [entryId]: { text: error instanceof Error ? error.message : 'Translation failed', status: 'error' }
            }));
        }
    }, []);

    // Detect if text contains non-ASCII characters (likely non-English)
    const isLikelyNonEnglish = (text: string): boolean => {
        // Check for Chinese, Arabic, Vietnamese, etc. characters
        const nonLatinPattern = /[\u4e00-\u9fff\u0600-\u06ff\u0400-\u04ff\u3040-\u309f\u30a0-\u30ff\u1100-\u11ff\uac00-\ud7af\u0e00-\u0e7f]/;
        return nonLatinPattern.test(text) || (clientLanguage && clientLanguage !== 'English');
    };

    return (
        <div className="space-y-4">
            {/* Info banner about translation */}
            {clientLanguage && clientLanguage !== 'English' && (
                <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-baby-blue-50 to-lime-green-50 dark:from-baby-blue-900/30 dark:to-lime-green-900/30 rounded-lg border border-baby-blue-200 dark:border-baby-blue-800">
                    <Globe className="h-5 w-5 text-baby-blue-600 dark:text-baby-blue-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                        Client's primary language: <strong>{clientLanguage}</strong> — Click "Translate" on entries to view English translation
                    </span>
                </div>
            )}
            
            {entries.length > 0 ? [...entries].reverse().map(entry => {
                const needsTranslation = isLikelyNonEnglish(entry.content);
                const translation = translations[entry.id];
                
                return (
                    <div key={entry.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-md border-l-4 border-baby-blue-300 dark:border-baby-blue-600">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{new Date(entry.date).toLocaleString()}</p>
                            {needsTranslation && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300">
                                    <Languages size={12} />
                                    {clientLanguage || 'Non-English'}
                                </span>
                            )}
                        </div>
                        
                        {/* Original content */}
                        <p className={`text-gray-800 dark:text-gray-200 whitespace-pre-wrap ${needsTranslation && translation?.status === 'success' ? 'text-sm italic opacity-75' : ''}`}>
                            {entry.content}
                        </p>
                        
                        {/* Translation section */}
                        {needsTranslation && (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                                {!translation && (
                                    <button 
                                        onClick={() => translateEntry(entry.id, entry.content)}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-baby-blue-500 hover:bg-baby-blue-600 rounded-md transition-colors"
                                    >
                                        <Languages size={14} /> Translate to English
                                    </button>
                                )}
                                
                                {translation?.status === 'loading' && (
                                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                        <Loader2 size={14} className="animate-spin" />
                                        <span className="text-sm">Translating with AI...</span>
                                    </div>
                                )}
                                
                                {translation?.status === 'success' && (
                                    <div>
                                        <div className="flex items-center gap-1 mb-2">
                                            <Globe size={14} className="text-lime-green-600 dark:text-lime-green-400" />
                                            <span className="text-xs font-semibold text-lime-green-700 dark:text-lime-green-400">
                                                English Translation:
                                            </span>
                                        </div>
                                        <p className="text-gray-800 dark:text-gray-100 font-medium whitespace-pre-wrap bg-lime-green-50 dark:bg-lime-green-900/30 p-3 rounded-md">
                                            {translation.text}
                                        </p>
                                    </div>
                                )}
                                
                                {translation?.status === 'error' && (
                                    <div className="flex items-center gap-2">
                                        <AlertCircle size={14} className="text-red-500" />
                                        <span className="text-sm text-red-600 dark:text-red-400">{translation.text}</span>
                                        <button 
                                            onClick={() => translateEntry(entry.id, entry.content)}
                                            className="inline-flex items-center gap-1 text-xs text-baby-blue-600 dark:text-baby-blue-400 hover:underline"
                                        >
                                            <RefreshCw size={12} /> Retry
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {/* Attachments */}
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
                );
            }) : <p className="text-gray-500 dark:text-gray-400">No journal entries from this client.</p>}
        </div>
    );
};

// Cache for translations to avoid re-translating the same message
const translationCache = new Map<string, string>();

const MessagesView: React.FC<{ messages: ChatMessage[], client: Client }> = ({ messages, client }) => {
    const [translations, setTranslations] = useState<Record<string, { text: string; status: 'loading' | 'success' | 'error' }>>({});
    const [autoTranslate, setAutoTranslate] = useState(true);

    // Auto-translate non-English patient messages
    const translateMessage = useCallback(async (msgId: string, text: string) => {
        // Check cache first
        const cacheKey = `${text}_English`;
        if (translationCache.has(cacheKey)) {
            setTranslations(prev => ({
                ...prev,
                [msgId]: { text: translationCache.get(cacheKey)!, status: 'success' }
            }));
            return;
        }

        setTranslations(prev => ({
            ...prev,
            [msgId]: { text: '', status: 'loading' }
        }));

        try {
            const translatedText = await translateText(text, "English");
            translationCache.set(cacheKey, translatedText);
            setTranslations(prev => ({
                ...prev,
                [msgId]: { text: translatedText, status: 'success' }
            }));
        } catch (error) {
            setTranslations(prev => ({
                ...prev,
                [msgId]: { text: error instanceof Error ? error.message : 'Translation failed', status: 'error' }
            }));
        }
    }, []);

    // Auto-translate on mount and when messages change
    useEffect(() => {
        if (!autoTranslate) return;
        
        messages.forEach(msg => {
            if (msg.sender === 'patient' && msg.language !== 'English' && !translations[msg.id]) {
                translateMessage(msg.id, msg.text);
            }
        });
    }, [messages, autoTranslate, translateMessage, translations]);

    const retryTranslation = (msgId: string, text: string) => {
        translateMessage(msgId, text);
    };

    return (
        <div className="space-y-4">
            {/* Auto-translate toggle and info banner */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-baby-blue-50 to-lime-green-50 dark:from-baby-blue-900/30 dark:to-lime-green-900/30 rounded-lg border border-baby-blue-200 dark:border-baby-blue-800">
                <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-baby-blue-600 dark:text-baby-blue-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        AI-Powered Translation
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        (Messages in other languages are automatically translated to English)
                    </span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Auto-translate</span>
                    <div className="relative">
                        <input
                            type="checkbox"
                            checked={autoTranslate}
                            onChange={(e) => setAutoTranslate(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-baby-blue-300 dark:peer-focus:ring-baby-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-500 peer-checked:bg-baby-blue-500"></div>
                    </div>
                </label>
            </div>

            {/* Messages list */}
            {messages.map(msg => {
                const isNonEnglishPatientMessage = msg.sender === 'patient' && msg.language !== 'English';
                const translation = translations[msg.id];
                
                return (
                    <div key={msg.id} className={`flex items-start gap-3 ${msg.sender === 'patient' ? '' : 'flex-row-reverse'}`}>
                        <div className={`rounded-lg max-w-lg ${msg.sender === 'patient' ? 'bg-baby-blue-100 dark:bg-baby-blue-900/50' : 'bg-lime-green-100 dark:bg-lime-green-900/50'}`}>
                            {/* Language badge for non-English messages */}
                            {isNonEnglishPatientMessage && (
                                <div className="px-3 pt-2">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300">
                                        <Languages size={12} />
                                        Original: {msg.language}
                                    </span>
                                </div>
                            )}
                            
                            <div className="p-3">
                                {/* Original message */}
                                <p className={`text-gray-800 dark:text-gray-100 ${isNonEnglishPatientMessage ? 'text-sm italic opacity-75' : ''}`}>
                                    {msg.text}
                                </p>
                                
                                {/* Translation section for non-English patient messages */}
                                {isNonEnglishPatientMessage && (
                                    <div className="mt-3 pt-3 border-t border-baby-blue-200 dark:border-baby-blue-700">
                                        <div className="flex items-center gap-1 mb-1">
                                            <Globe size={12} className="text-lime-green-600 dark:text-lime-green-400" />
                                            <span className="text-xs font-semibold text-lime-green-700 dark:text-lime-green-400">
                                                English Translation:
                                            </span>
                                        </div>
                                        
                                        {translation?.status === 'loading' && (
                                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                                <Loader2 size={14} className="animate-spin" />
                                                <span className="text-sm">Translating...</span>
                                            </div>
                                        )}
                                        
                                        {translation?.status === 'success' && (
                                            <p className="text-gray-800 dark:text-gray-100 font-medium">
                                                {translation.text}
                                            </p>
                                        )}
                                        
                                        {translation?.status === 'error' && (
                                            <div className="flex items-center gap-2">
                                                <AlertCircle size={14} className="text-red-500" />
                                                <span className="text-sm text-red-600 dark:text-red-400">{translation.text}</span>
                                                <button 
                                                    onClick={() => retryTranslation(msg.id, msg.text)}
                                                    className="inline-flex items-center gap-1 text-xs text-baby-blue-600 dark:text-baby-blue-400 hover:underline"
                                                >
                                                    <RefreshCw size={12} /> Retry
                                                </button>
                                            </div>
                                        )}
                                        
                                        {!translation && !autoTranslate && (
                                            <button 
                                                onClick={() => translateMessage(msg.id, msg.text)}
                                                className="inline-flex items-center gap-1 text-sm text-baby-blue-600 dark:text-baby-blue-400 hover:underline"
                                            >
                                                <Languages size={14} /> Click to translate
                                            </button>
                                        )}
                                    </div>
                                )}
                                
                                {/* Timestamp */}
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                    {new Date(msg.timestamp).toLocaleString()}
                                </div>
                            </div>
                        </div>
                        
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center font-bold text-gray-600 dark:text-gray-200 text-sm flex-shrink-0" title={msg.sender === 'patient' ? client.fullName : 'Navigator'}>
                            {msg.sender === 'patient' ? client.fullName.charAt(0) : 'N'}
                        </div>
                    </div>
                );
            })}
            {messages.length === 0 && <p className="text-gray-500 dark:text-gray-400">No messages exchanged with this client.</p>}
        </div>
    );
};

export default PatientSubmissionsViewer;