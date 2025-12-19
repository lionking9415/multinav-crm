import React, { useState, useRef, useEffect } from 'react';
import type { Client, PatientData, ChatMessage, ExperienceEntry, Attachment } from '../types';
import { translateText } from '../services/geminiService';
import { patientDataService } from '../services/supabaseService';
import Card from './Card';
import { BookUser, MessageSquare, ListChecks, Send, Languages, LogOut, Sun, Moon, Leaf, Paperclip, X, UploadCloud, Loader2 } from 'lucide-react';

interface MyNavigationProps {
    client: Client;
    data: PatientData;
    setData: (newData: PatientData) => void;
    onLogout: () => void;
    isDarkMode: boolean;
    toggleDarkMode: () => void;
}

const MyNavigation: React.FC<MyNavigationProps> = ({ client, data, setData, onLogout, isDarkMode, toggleDarkMode }) => {
    const [activeTab, setActiveTab] = useState('experience');

    const renderContent = () => {
        switch (activeTab) {
            case 'experience':
                return <ExperienceJournal experiences={data.experiences} setExperiences={(newExperiences) => setData({ ...data, experiences: newExperiences })} clientId={client.id} />;
            case 'messages':
                return <CommunicationHub messages={data.messages} setMessages={(newMessages) => setData({ ...data, messages: newMessages })} client={client} />;
            default:
                return null;
        }
    };

    const TabButton = ({ id, label, icon }: { id: string; label: string; icon: React.ReactNode }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center p-3 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === id
                    ? 'bg-white dark:bg-gray-800 text-lime-green-600 dark:text-lime-green-400 border-b-2 border-lime-green-500'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
        >
            {icon}
            <span className="ml-2">{label}</span>
        </button>
    );

    return (
        <div className={`min-h-screen ${isDarkMode ? 'dark bg-gray-900' : 'bg-baby-blue-50'} font-sans`}>
            <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-md h-16 flex-shrink-0">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-full flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <Leaf className="h-8 w-8 text-lime-green-500" />
                        <h1 className="text-xl font-bold text-baby-blue-500 dark:text-white">My Navigation Portal</h1>
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden sm:block">Welcome, {client.fullName}!</span>
                        <button onClick={toggleDarkMode} className={`p-2 rounded-full ${isDarkMode ? 'text-yellow-400 bg-gray-700' : 'text-baby-blue-500 bg-baby-blue-200'}`} aria-label="Toggle dark mode">
                            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                        <button onClick={onLogout} className="p-2 rounded-full text-red-500 bg-red-100 dark:text-red-300 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors" aria-label="Logout" title="Logout">
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>
            <main className="p-4 sm:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="flex bg-gray-200 dark:bg-gray-900/50 rounded-t-lg">
                        <TabButton id="experience" label="My Experience" icon={<BookUser size={18} />} />
                        <TabButton id="messages" label="Messages" icon={<MessageSquare size={18} />} />
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-b-lg shadow-lg">
                        {renderContent()}
                    </div>
                </div>
            </main>
        </div>
    );
};


// Sub-components for MyNavigation

const ExperienceJournal = ({ experiences, setExperiences, clientId }: { experiences: ExperienceEntry[], setExperiences: (e: ExperienceEntry[]) => void, clientId: string }) => {
    const [newEntry, setNewEntry] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const readFileAsDataURL = (file: File): Promise<Attachment> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve({
                name: file.name,
                type: file.type,
                data: reader.result as string,
            });
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEntry.trim() || isSaving) return;

        setIsSaving(true);
        const fileAttachments = await Promise.all(attachments.map(readFileAsDataURL));

        const entry: ExperienceEntry = {
            id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            date: new Date().toISOString().split('T')[0],
            content: newEntry,
            isRead: false,
            attachments: fileAttachments,
        };
        
        try {
            // Save to database
            await patientDataService.createExperience(clientId, entry);
            console.log('[MyNavigation] Experience saved to database:', entry.id);
            
            setExperiences([entry, ...experiences]);
            setNewEntry('');
            setAttachments([]);
        } catch (error) {
            console.error('[MyNavigation] Failed to save experience:', error);
            // Still update local state
            setExperiences([entry, ...experiences]);
            setNewEntry('');
            setAttachments([]);
            alert('Entry saved locally but may not sync. Please check your connection.');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setAttachments(prev => [...prev, ...Array.from(event.target.files!)]);
        }
    };

    const removeAttachment = (fileToRemove: File) => {
        setAttachments(prev => prev.filter(file => file !== fileToRemove));
    };

    return (
        <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">My Experience Journal</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Share your experiences, needs, or difficulties with your navigator. Your notes are private and will help us support you better.</p>
            <form onSubmit={handleSubmit}>
                <textarea
                    value={newEntry}
                    onChange={(e) => setNewEntry(e.target.value)}
                    rows={5}
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-lime-green-500 focus:border-lime-green-500"
                    placeholder="Type your thoughts here..."
                />

                <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.doc,.docx,image/*"
                />

                <div className="mt-4 flex flex-wrap items-center gap-4">
                     <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isSaving} className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-500 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50">
                        <UploadCloud className="mr-2 h-5 w-5" />
                        Attach Files
                    </button>
                    <button type="submit" disabled={isSaving || !newEntry.trim()} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-lime-green-500 hover:bg-lime-green-600 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isSaving ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Saving...</> : 'Save Entry'}
                    </button>
                </div>
                 {attachments.length > 0 && (
                    <div className="mt-4 space-y-2">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Selected files:</p>
                        <ul className="list-disc list-inside space-y-1">
                            {attachments.map((file, index) => (
                                <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-between bg-gray-100 dark:bg-gray-700 p-2 rounded">
                                    <span>{file.name}</span>
                                    <button onClick={() => removeAttachment(file)} className="text-red-500 hover:text-red-700">
                                        <X size={16} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </form>
            <div className="mt-6">
                <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Past Entries</h3>
                <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                    {experiences.length > 0 ? experiences.map(entry => (
                        <div key={entry.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                            <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(entry.date).toLocaleDateString()}</p>
                            <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{entry.content}</p>
                            {entry.attachments && entry.attachments.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                                    <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Attachments:</h4>
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
                    )) : <p className="text-gray-500 dark:text-gray-400">No entries yet.</p>}
                </div>
            </div>
        </div>
    );
};

const CommunicationHub = ({ messages, setMessages, client }: { messages: ChatMessage[], setMessages: (m: ChatMessage[]) => void, client: Client }) => {
    const [newMessage, setNewMessage] = useState('');
    const [isTranslating, setIsTranslating] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const endOfMessagesRef = useRef<HTMLDivElement>(null);
    const patientLanguage = client.languages[0] || 'English';

    useEffect(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!newMessage.trim() || isSending) return;
        
        setIsSending(true);
        const message: ChatMessage = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            sender: 'patient',
            text: newMessage,
            language: patientLanguage,
            isRead: false,
        };
        
        try {
            // Save to database
            await patientDataService.createMessage(client.id, message);
            console.log('[MyNavigation] Message saved to database:', message.id);
            
            // Update local state
            setMessages([...messages, message]);
            setNewMessage('');
        } catch (error) {
            console.error('[MyNavigation] Failed to save message:', error);
            // Still update local state so user sees the message
            setMessages([...messages, message]);
            setNewMessage('');
            alert('Message sent but may not be saved. Please check your connection.');
        } finally {
            setIsSending(false);
        }
    };

    const handleTranslate = async (text: string, targetLang: string) => {
        if (!text) return;
        setIsTranslating(true);
        try {
            const translatedText = await translateText(text, targetLang);
            alert(`Translation to ${targetLang}:\n\n${translatedText}`);
        } catch (error) {
            alert(`Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsTranslating(false);
        }
    };

    return (
        <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Secure Messages</h2>
            <div className="h-80 border rounded-md p-4 space-y-4 overflow-y-auto flex flex-col bg-gray-50 dark:bg-gray-700/50">
                {messages.length > 0 ? messages.map(msg => (
                    <div key={msg.id} className={`flex items-end gap-2 ${msg.sender === 'patient' ? 'justify-end' : 'justify-start'}`}>
                        {msg.sender === 'navigator' && <div className="w-8 h-8 rounded-full bg-lime-green-200 flex items-center justify-center font-bold text-lime-green-700 text-sm">N</div>}
                        <div className={`max-w-xs p-3 rounded-lg ${msg.sender === 'patient' ? 'bg-baby-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100'}`}>
                            <p>{msg.text}</p>
                            <div className="text-xs opacity-70 mt-1 flex items-center justify-between">
                                <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                {msg.sender === 'navigator' && msg.language !== patientLanguage && (
                                    <button onClick={() => handleTranslate(msg.text, patientLanguage)} disabled={isTranslating} className="ml-2 p-1 rounded-full hover:bg-black/10 disabled:opacity-50">
                                        <Languages size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )) : <p className="text-gray-500 dark:text-gray-400 text-center m-auto">No messages yet. Send a message to start the conversation.</p>}
                <div ref={endOfMessagesRef} />
            </div>
            <div className="mt-4 flex gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isSending && handleSend()}
                    disabled={isSending}
                    className="flex-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-lime-green-500 focus:border-lime-green-500 disabled:opacity-50"
                    placeholder={`Type your message in ${patientLanguage}...`}
                />
                <button 
                    onClick={handleSend} 
                    disabled={isSending || !newMessage.trim()}
                    className="px-4 py-2 bg-baby-blue-500 text-white rounded-md hover:bg-baby-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20}/>}
                </button>
            </div>
        </div>
    );
};

export default MyNavigation;