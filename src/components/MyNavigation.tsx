import React, { useState, useRef, useEffect } from 'react';
import type { Client, PatientData, ChatMessage, ExperienceEntry, Attachment } from '../types';
import { translateText } from '../services/geminiService';
import { patientDataService, surveyService } from '../services/supabaseService';
import Card from './Card';
import { BookUser, MessageSquare, ListChecks, Send, Languages, LogOut, Sun, Moon, Leaf, Paperclip, X, UploadCloud, Loader2, CheckCircle } from 'lucide-react';

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

    const patientLanguage = client.languages[0] || 'English';

    const renderContent = () => {
        switch (activeTab) {
            case 'experience':
                return <ExperienceJournal experiences={data.experiences} setExperiences={(newExperiences) => setData({ ...data, experiences: newExperiences })} clientId={client.id} patientLanguage={patientLanguage} />;
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

const ExperienceJournal = ({ experiences, setExperiences, clientId, patientLanguage }: { experiences: ExperienceEntry[], setExperiences: (e: ExperienceEntry[]) => void, clientId: string, patientLanguage: string }) => {
    const [newEntry, setNewEntry] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [translatingId, setTranslatingId] = useState<string | null>(null);
    const [translations, setTranslations] = useState<Record<string, string>>({});
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

    const handleTranslate = async (entryId: string, text: string) => {
        if (!text || translations[entryId]) return;
        setTranslatingId(entryId);
        try {
            const translatedText = await translateText(text, 'English');
            setTranslations(prev => ({ ...prev, [entryId]: translatedText }));
        } catch (error) {
            console.error('Translation failed:', error);
            alert(`Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setTranslatingId(null);
        }
    };

    const showTranslation = patientLanguage !== 'English';

    return (
        <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">My Experience Journal</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Share your experiences, needs, or difficulties with your navigator. Your notes are private and will help us support you better.
                {showTranslation && (
                    <span className="block mt-1 text-lime-green-600 dark:text-lime-green-400">
                        <Languages size={14} className="inline mr-1" />
                        Write in {patientLanguage} - staff will see it translated to English.
                    </span>
                )}
            </p>
            <form onSubmit={handleSubmit}>
                <textarea
                    value={newEntry}
                    onChange={(e) => setNewEntry(e.target.value)}
                    rows={5}
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-lime-green-500 focus:border-lime-green-500"
                    placeholder={`Type your thoughts here${showTranslation ? ` in ${patientLanguage}` : ''}...`}
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
            {/* Satisfaction Survey */}
            <SatisfactionSurvey clientId={clientId} />
        </div>
    );
};

// Satisfaction Survey Component with Smiley Face Likert Scale
const SatisfactionSurvey = ({ clientId }: { clientId: string }) => {
    const [responses, setResponses] = useState<Record<string, number>>({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const questions = [
        { id: 'q1', text: 'Staff showed respect for how you were feeling.' },
        { id: 'q2', text: 'You had opportunities to discuss your support or care needs with staff.' },
        { id: 'q3', text: 'Your culture, beliefs and values were respected.' },
    ];

    const ratingOptions = [
        { value: 1, emoji: '😠', label: 'Strongly Disagree', color: 'bg-red-500', hoverColor: 'hover:bg-red-400', selectedRing: 'ring-red-500' },
        { value: 2, emoji: '😟', label: 'Disagree', color: 'bg-orange-500', hoverColor: 'hover:bg-orange-400', selectedRing: 'ring-orange-500' },
        { value: 3, emoji: '😐', label: 'Neutral', color: 'bg-yellow-400', hoverColor: 'hover:bg-yellow-300', selectedRing: 'ring-yellow-400' },
        { value: 4, emoji: '🙂', label: 'Agree', color: 'bg-lime-400', hoverColor: 'hover:bg-lime-300', selectedRing: 'ring-lime-400' },
        { value: 5, emoji: '😄', label: 'Strongly Agree', color: 'bg-green-500', hoverColor: 'hover:bg-green-400', selectedRing: 'ring-green-500' },
    ];

    // Check if user already submitted a survey
    useEffect(() => {
        const checkExistingSurvey = async () => {
            try {
                const existing = await surveyService.getByClientId(clientId);
                if (existing) {
                    setIsSubmitted(true);
                }
            } catch (error) {
                console.log('[Survey] No existing survey found or error:', error);
            } finally {
                setIsLoading(false);
            }
        };
        checkExistingSurvey();
    }, [clientId]);

    const handleRatingChange = (questionId: string, value: number) => {
        if (isSubmitted) return;
        setResponses(prev => ({ ...prev, [questionId]: value }));
    };

    const handleSubmit = async () => {
        if (Object.keys(responses).length < questions.length) {
            alert('Please answer all questions before submitting.');
            return;
        }

        setIsSubmitting(true);
        try {
            const surveyResponse = {
                id: `srv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                clientId: clientId,
                q1Rating: responses.q1,
                q2Rating: responses.q2,
                q3Rating: responses.q3,
                submittedAt: new Date().toISOString()
            };
            
            await surveyService.create(surveyResponse);
            console.log('[Survey] Saved to database:', surveyResponse.id);
            
            setIsSubmitted(true);
        } catch (error) {
            console.error('[Survey] Failed to submit:', error);
            // Still mark as submitted locally
            setIsSubmitted(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    const allAnswered = Object.keys(responses).length === questions.length;

    if (isLoading) {
        return (
            <div className="mt-6 p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Loading survey...</span>
                </div>
            </div>
        );
    }

    if (isSubmitted) {
        return (
            <div className="mt-6 p-6 bg-lime-green-50 dark:bg-lime-green-900/20 rounded-lg border border-lime-green-200 dark:border-lime-green-800">
                <div className="text-center">
                    <CheckCircle className="w-12 h-12 text-lime-green-500 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-lime-green-700 dark:text-lime-green-300 mb-2">
                        Thank you for your feedback!
                    </h3>
                    <p className="text-sm text-lime-green-600 dark:text-lime-green-400">
                        Your responses help us improve our services.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-1">
                How was your experience?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Please rate your experience with our service by selecting a face for each statement.
            </p>

            {/* Rating Scale Legend */}
            <div className="flex justify-center gap-2 mb-6 flex-wrap">
                {ratingOptions.map(option => (
                    <div key={option.value} className="flex flex-col items-center">
                        <span className="text-2xl">{option.emoji}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center leading-tight" style={{ maxWidth: '60px' }}>
                            {option.label}
                        </span>
                    </div>
                ))}
            </div>

            <div className="space-y-6">
                {questions.map((question, qIndex) => (
                    <div key={question.id} className="space-y-3">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            {qIndex + 1}. {question.text}
                        </p>
                        <div className="flex justify-center gap-3 sm:gap-4">
                            {ratingOptions.map(option => {
                                const isSelected = responses[question.id] === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => handleRatingChange(question.id, option.value)}
                                        className={`
                                            w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-2xl sm:text-3xl
                                            transition-all duration-200 transform
                                            ${isSelected 
                                                ? `${option.color} ring-4 ${option.selectedRing} ring-offset-2 dark:ring-offset-gray-800 scale-110 shadow-lg` 
                                                : `bg-gray-200 dark:bg-gray-600 ${option.hoverColor} hover:scale-105 grayscale hover:grayscale-0`
                                            }
                                        `}
                                        title={option.label}
                                        aria-label={`${option.label} for question ${qIndex + 1}`}
                                    >
                                        {option.emoji}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 flex justify-center">
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!allAnswered || isSubmitting}
                    className={`
                        px-6 py-2 rounded-lg font-medium text-white transition-all
                        ${allAnswered 
                            ? 'bg-lime-green-500 hover:bg-lime-green-600 cursor-pointer' 
                            : 'bg-gray-400 cursor-not-allowed'
                        }
                        disabled:opacity-50
                    `}
                >
                    {isSubmitting ? (
                        <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Submitting...
                        </span>
                    ) : (
                        'Submit Feedback'
                    )}
                </button>
            </div>
            
            {!allAnswered && (
                <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
                    Please answer all {questions.length} questions to submit
                </p>
            )}
        </div>
    );
};

const CommunicationHub = ({ messages, setMessages, client }: { messages: ChatMessage[], setMessages: (m: ChatMessage[]) => void, client: Client }) => {
    const [newMessage, setNewMessage] = useState('');
    const [translatingIds, setTranslatingIds] = useState<Set<string>>(new Set());
    const [translations, setTranslations] = useState<Record<string, string>>({});
    const [isSending, setIsSending] = useState(false);
    const endOfMessagesRef = useRef<HTMLDivElement>(null);
    const processedIdsRef = useRef<Set<string>>(new Set()); // Track already processed messages
    const patientLanguage = client.languages[0] || 'English';
    const needsAutoTranslate = patientLanguage !== 'English';

    useEffect(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Auto-translate all messages:
    // - Navigator messages: English → Patient's language
    // - Patient messages: Patient's language → English (so patient can see what staff sees)
    useEffect(() => {
        if (!needsAutoTranslate) return;
        
        const translateAllMessages = async () => {
            // Filter messages that haven't been processed yet
            const messagesToTranslate = messages.filter(
                msg => !processedIdsRef.current.has(msg.id)
            );
            
            if (messagesToTranslate.length === 0) return;
            
            for (const msg of messagesToTranslate) {
                // Mark as processed immediately to prevent duplicate calls
                processedIdsRef.current.add(msg.id);
                setTranslatingIds(prev => new Set(prev).add(msg.id));
                
                try {
                    // Navigator messages: translate to patient's language
                    // Patient messages: translate to English (what staff sees)
                    const targetLang = msg.sender === 'navigator' ? patientLanguage : 'English';
                    console.log(`[AutoTranslate] Translating ${msg.sender} message to ${targetLang}:`, msg.id);
                    const translatedText = await translateText(msg.text, targetLang);
                    setTranslations(prev => ({ ...prev, [msg.id]: translatedText }));
                } catch (error) {
                    console.error('[AutoTranslate] Failed to translate message:', msg.id, error);
                    // Remove from processed so it can be retried
                    processedIdsRef.current.delete(msg.id);
                } finally {
                    setTranslatingIds(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(msg.id);
                        return newSet;
                    });
                }
            }
        };
        
        translateAllMessages();
    }, [messages, patientLanguage, needsAutoTranslate]); // Removed translations and translatingIds from deps

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

    return (
        <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Secure Messages</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                <Languages size={14} className="inline mr-1" />
                {needsAutoTranslate ? (
                    <>Write in {patientLanguage} - your messages will be translated for staff. Staff replies are automatically translated to {patientLanguage} for you.</>
                ) : (
                    <>Send secure messages to your healthcare navigator.</>
                )}
            </p>
            <div className="h-80 border rounded-md p-4 space-y-4 overflow-y-auto flex flex-col bg-gray-50 dark:bg-gray-700/50">
                {messages.length > 0 ? messages.map(msg => {
                    const hasTranslation = translations[msg.id];
                    const isTranslatingThis = translatingIds.has(msg.id);
                    const isNavigatorMessage = msg.sender === 'navigator';
                    const isPatientMessage = msg.sender === 'patient';
                    
                    // Patient can manually translate their own messages to see English version
                    const canManuallyTranslate = isPatientMessage && needsAutoTranslate && !hasTranslation;
                    
                    return (
                        <div key={msg.id} className={`flex items-end gap-2 ${isPatientMessage ? 'justify-end' : 'justify-start'}`}>
                            {isNavigatorMessage && <div className="w-8 h-8 rounded-full bg-lime-green-200 flex items-center justify-center font-bold text-lime-green-700 text-sm">N</div>}
                            <div className="max-w-xs">
                                {/* Navigator message: show English on top, patient's language translation below */}
                                {isNavigatorMessage && needsAutoTranslate ? (
                                    <div className="space-y-1">
                                        {/* Original English message (on top) */}
                                        <div className="p-3 rounded-lg bg-lime-green-500 text-white">
                                            <p>{msg.text}</p>
                                            <div className="text-xs opacity-70 mt-1">
                                                <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                        {/* Translation to patient's language (below) */}
                                        {isTranslatingThis ? (
                                            <div className="p-2 rounded bg-lime-green-100 dark:bg-lime-green-900/50 text-xs flex items-center gap-2 text-lime-green-700 dark:text-lime-green-300">
                                                <Loader2 size={12} className="animate-spin" />
                                                <span>Translating to {patientLanguage}...</span>
                                            </div>
                                        ) : hasTranslation && (
                                            <div className="p-2 rounded bg-lime-green-100 dark:bg-lime-green-900/50 text-xs">
                                                <span className="text-lime-green-700 dark:text-lime-green-300 flex items-center gap-1 mb-1 font-semibold">
                                                    <Languages size={10} />
                                                    {patientLanguage}:
                                                </span>
                                                <p className="text-lime-green-800 dark:text-lime-green-200 italic">{hasTranslation}</p>
                                            </div>
                                        )}
                                    </div>
                                ) : isPatientMessage && needsAutoTranslate ? (
                                    /* Patient message with auto-translation to English */
                                    <div className="space-y-1">
                                        {/* Original message in patient's language (prominent) */}
                                        <div className="p-3 rounded-lg bg-baby-blue-500 text-white">
                                            <p>{msg.text}</p>
                                            <div className="text-xs opacity-70 mt-1">
                                                <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                        {/* English translation (what staff sees) - auto displayed below */}
                                        {isTranslatingThis ? (
                                            <div className="p-2 rounded bg-baby-blue-100 dark:bg-baby-blue-900/50 text-xs flex items-center gap-2 text-baby-blue-700 dark:text-baby-blue-300">
                                                <Loader2 size={12} className="animate-spin" />
                                                <span>Translating to English...</span>
                                            </div>
                                        ) : hasTranslation && (
                                            <div className="p-2 rounded text-xs bg-baby-blue-100 dark:bg-baby-blue-900/50 text-baby-blue-800 dark:text-baby-blue-200">
                                                <span className="font-semibold flex items-center gap-1 mb-1">
                                                    <Languages size={10} />
                                                    English (what staff sees):
                                                </span>
                                                <p className="italic">{hasTranslation}</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* English-speaking patient or navigator message without translation needed */
                                    <div className={`p-3 rounded-lg ${isPatientMessage ? 'bg-baby-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100'}`}>
                                        <p>{msg.text}</p>
                                        <div className="text-xs opacity-70 mt-1">
                                            <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                }) : <p className="text-gray-500 dark:text-gray-400 text-center m-auto">No messages yet. Send a message to start the conversation.</p>}
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
                    placeholder={`Type your message${needsAutoTranslate ? ` in ${patientLanguage}` : ''}...`}
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