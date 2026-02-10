import React, { useState, Fragment } from 'react';
import type { GpPractice } from '../types';
import Card from './Card';
import { scanForGps } from '../services/geminiService';
import { gpPracticeService } from '../services/supabaseService';
import { Search, Plus, Pencil, Trash2, Globe, Phone, MapPin, ServerCrash, Bot, Loader2 } from 'lucide-react';

interface GpEngagementProps {
  practices: GpPractice[];
  setPractices: React.Dispatch<React.SetStateAction<GpPractice[]>>;
}

const InputField: React.FC<{
    label: string;
    value: string;
    onChange: (value: string) => void;
}> = ({ label, value, onChange }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
    </div>
);

interface PracticeModalProps {
    currentPractice: GpPractice | null;
    setCurrentPractice: React.Dispatch<React.SetStateAction<GpPractice | null>>;
    setIsModalOpen: (open: boolean) => void;
    handleSave: () => void;
    isSaving: boolean;
    saveError: string | null;
}

const PracticeModal: React.FC<PracticeModalProps> = ({
    currentPractice,
    setCurrentPractice,
    setIsModalOpen,
    handleSave,
    isSaving,
    saveError,
}) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl">
            <div className="p-6 border-b dark:border-gray-700">
                <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                    {currentPractice?.id ? 'Edit Practice Details' : 'Add New Practice'}
                </h3>
            </div>
            {saveError && (
                <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-700 dark:text-red-300">
                    {saveError}
                </div>
            )}
            <div className="p-6 space-y-4">
                <InputField
                    label="Practice Name (required)"
                    value={currentPractice?.name || ''}
                    onChange={(val) =>
                        setCurrentPractice((p) => (p ? { ...p, name: val } : p))
                    }
                />
                <InputField
                    label="Address"
                    value={currentPractice?.address || ''}
                    onChange={(val) =>
                        setCurrentPractice((p) => (p ? { ...p, address: val } : p))
                    }
                />
                <InputField
                    label="Phone"
                    value={currentPractice?.phone || ''}
                    onChange={(val) =>
                        setCurrentPractice((p) => (p ? { ...p, phone: val } : p))
                    }
                />
                <InputField
                    label="Website"
                    value={currentPractice?.website || ''}
                    onChange={(val) =>
                        setCurrentPractice((p) => (p ? { ...p, website: val } : p))
                    }
                />
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                    <textarea
                        name="notes"
                        value={currentPractice?.notes || ''}
                        onChange={(e) => setCurrentPractice(p => p ? { ...p, notes: e.target.value } : null)}
                        rows={4}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 disabled:opacity-50">Cancel</button>
                <button type="button" onClick={handleSave} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-lime-green-500 border border-transparent rounded-md shadow-sm hover:bg-lime-green-600 disabled:opacity-50 inline-flex items-center gap-2">
                    {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : 'Save'}
                </button>
            </div>
        </div>
    </div>
);

const GpEngagement: React.FC<GpEngagementProps> = ({ practices, setPractices }) => {
    const [scanQuery, setScanQuery] = useState('GPs in Perth with interest in multicultural patients');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPractice, setCurrentPractice] = useState<GpPractice | null>(null);

    const handleScan = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const results = await scanForGps(scanQuery);
            const existingNames = new Set(practices.map(p => p.name.toLowerCase()));
            const newPractices = results
                .filter(res => res.name && !existingNames.has(res.name.toLowerCase()))
                .map(res => ({
                    ...res,
                    id: `gp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                    address: res.address || '',
                    notes: 'Scanned from web.',
                }));

            if (newPractices.length === 0) {
                alert("Scan complete. No new practices were found matching the query.");
            } else {
                for (const p of newPractices) {
                    try {
                        await gpPracticeService.create(p);
                    } catch (e) {
                        console.error('Failed to save scanned practice:', p.name, e);
                    }
                }
                setPractices(prev => [...prev, ...newPractices]);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'An unknown error occurred during the scan.';
            setError(msg);
            if (!import.meta.env.VITE_GEMINI_API_KEY && !import.meta.env.VITE_API_KEY) {
                setError('API key not set. Add VITE_GEMINI_API_KEY to .env for AI web scan.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenModal = (practice: GpPractice | null = null) => {
        setSaveError(null);
        setCurrentPractice(practice ? { ...practice } : { id: '', name: '', address: '', phone: '', website: '', notes: '' });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!currentPractice || !currentPractice.name?.trim()) {
            alert("Practice name is required.");
            return;
        }
        setIsSaving(true);
        setSaveError(null);
        const practice = {
            ...currentPractice,
            name: currentPractice.name.trim(),
            address: currentPractice.address ?? '',
            phone: currentPractice.phone ?? '',
            website: currentPractice.website ?? '',
            notes: currentPractice.notes ?? '',
        };
        try {
            if (practice.id) {
                await gpPracticeService.update(practice.id, practice);
                setPractices(prev => prev.map(p => p.id === practice.id ? practice : p));
            } else {
                const id = `gp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                const toCreate = { ...practice, id };
                await gpPracticeService.create(toCreate);
                setPractices(prev => [...prev, toCreate]);
            }
            setIsModalOpen(false);
            setCurrentPractice(null);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to save practice.';
            setSaveError(msg);
            alert(msg);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (practiceId: string) => {
        if (!window.confirm('Are you sure you want to delete this practice from the directory?')) return;
        try {
            await gpPracticeService.delete(practiceId);
            setPractices(prev => prev.filter(p => p.id !== practiceId));
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to delete practice.');
        }
    };

    return (
        <Fragment>
            {isModalOpen && (
                <PracticeModal
                    currentPractice={currentPractice}
                    setCurrentPractice={setCurrentPractice}
                    setIsModalOpen={setIsModalOpen}
                    handleSave={handleSave}
                    isSaving={isSaving}
                    saveError={saveError}
                />
            )}
            <Card>
                <div className="p-4 bg-baby-blue-50/50 dark:bg-gray-800/60 rounded-lg border border-baby-blue-200 dark:border-gray-700 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                        <div>
                            <label htmlFor="scan-query" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                AI Web Scan Query
                            </label>
                            <div className="relative mt-1">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Search className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    id="scan-query"
                                    value={scanQuery}
                                    onChange={(e) => setScanQuery(e.target.value)}
                                    placeholder="e.g. GPs in Northbridge, multicultural GPs Perth, clinics with interpreters"
                                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 pl-10 focus:border-lime-green-500 focus:ring-lime-green-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Use a specific query (suburb, “multicultural”, “interpreter”) for better results. Requires VITE_GEMINI_API_KEY.</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-start md:justify-end">
                             <button
                                onClick={handleScan}
                                disabled={isLoading}
                                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-baby-blue-500 hover:bg-baby-blue-400 focus:outline-none disabled:bg-gray-400"
                            >
                                {isLoading ? (
                                    <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Scanning...
                                    </>
                                ) : (
                                    <> <Bot className="mr-2 h-5 w-5" /> Scan Web for Clinics </>
                                )}
                            </button>
                             <button
                                onClick={() => handleOpenModal()}
                                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-lime-green-500 hover:bg-lime-green-600 focus:outline-none"
                            >
                                <Plus className="mr-2 h-5 w-5" />
                                Add Manually
                            </button>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="flex items-center p-4 mb-4 bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 rounded-md">
                        <ServerCrash className="h-6 w-6 text-red-600 dark:text-red-400 mr-3" />
                        <div>
                            <p className="font-semibold text-red-800 dark:text-red-200">Scan Failed</p>
                            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                        </div>
                    </div>
                )}
                
                <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-300">
                            <tr>
                                <th scope="col" className="px-6 py-3 min-w-[200px]">Practice Name</th>
                                <th scope="col" className="px-6 py-3 min-w-[250px]">Details</th>
                                <th scope="col" className="px-6 py-3 min-w-[300px]">Staff Notes</th>
                                <th scope="col" className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {practices.map(p => (
                                <tr key={p.id} className="bg-white border-b dark:bg-gray-900 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <th scope="row" className="px-6 py-4 font-medium text-gray-900 dark:text-white">{p.name}</th>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1 text-xs">
                                            {p.address && <div className="flex items-center gap-2"><MapPin className="h-3 w-3 text-gray-400 shrink-0"/><span>{p.address}</span></div>}
                                            {p.phone && <div className="flex items-center gap-2"><Phone className="h-3 w-3 text-gray-400 shrink-0"/><span>{p.phone}</span></div>}
                                            {p.website && <div className="flex items-center gap-2"><Globe className="h-3 w-3 text-gray-400 shrink-0"/><a href={p.website.startsWith('http') ? p.website : `//${p.website}`} target="_blank" rel="noopener noreferrer" className="text-baby-blue-500 hover:underline truncate">{p.website}</a></div>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{p.notes}</td>
                                    <td className="px-6 py-4 text-right space-x-1">
                                        <button onClick={() => handleOpenModal(p)} className="p-2 text-gray-500 hover:text-lime-green-600 dark:hover:text-lime-green-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                            <Pencil className="h-5 w-5" />
                                        </button>
                                        <button onClick={() => handleDelete(p.id)} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {practices.length === 0 && (
                        <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                            No GP practices in the directory. Use the AI Web Scan or add one manually.
                        </div>
                    )}
                </div>
            </Card>
        </Fragment>
    );
};

export default GpEngagement;