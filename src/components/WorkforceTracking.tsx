import React, { useMemo, useState } from 'react';
import type { WorkforceData, Workforce } from '../types';
import Card from './Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ETHNICITY_OPTIONS, LANGUAGE_OPTIONS } from '../constants';
import MultiSelect from './MultiSelect';
import { Trash2, FileDown, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { workforceService } from '../services/supabaseService';

interface WorkforceTrackingProps {
  workforce: WorkforceData;
  setWorkforce: (workforce: WorkforceData) => void;
}

const COLORS = ['#84cc16', '#a3e635', '#bef264', '#d9f99d', '#ecfccb', '#d1fae5', '#a7f3d0' ];

const WorkforceInputRow: React.FC<{
    staff: Workforce;
    onChange: (field: keyof Workforce, value: any) => void;
    onDelete: () => void;
}> = ({ staff, onChange, onDelete }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-[3fr_1fr_2fr_3fr_auto] gap-4 items-center p-2 rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50">
            <input
                type="text"
                value={staff.role}
                onChange={(e) => onChange('role', e.target.value)}
                placeholder="Role"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
             <input
                type="number"
                min="0"
                step="0.1"
                value={staff.fte}
                onChange={(e) => onChange('fte', parseFloat(e.target.value) || 0)}
                placeholder="FTE"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
            <select
                value={staff.ethnicity}
                onChange={(e) => onChange('ethnicity', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
                <option value="">Select Ethnicity</option>
                {ETHNICITY_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
            </select>
            <div>
                <MultiSelect
                    options={LANGUAGE_OPTIONS}
                    selectedOptions={staff.languages}
                    onChange={(langs) => onChange('languages', langs)}
                />
            </div>
             <button onClick={onDelete} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-red-100 dark:hover:bg-red-800/50 transition-colors justify-self-end" title="Delete Staff">
                <Trash2 className="h-5 w-5" />
             </button>
        </div>
    );
};

const StaffRegionEditor: React.FC<{
    region: 'north' | 'south';
    regionName: string;
    workforce: WorkforceData;
    handleWorkforceChange: (region: 'north' | 'south', index: number, field: keyof Workforce, value: any) => void;
    handleDeleteStaff: (region: 'north' | 'south', index: number) => void;
    addStaff: (region: 'north' | 'south') => void;
}> = ({ region, regionName, workforce, handleWorkforceChange, handleDeleteStaff, addStaff }) => (
    <div className="p-4 bg-white/50 dark:bg-gray-800/30 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{regionName} Staff Entries</h3>
        
        <div className="hidden md:grid grid-cols-[3fr_1fr_2fr_3fr_auto] gap-4 items-center mt-4 mb-1 px-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            <span>Role</span>
            <span>FTE</span>
            <span>Ethnicity</span>
            <span>Languages</span>
            <span className="justify-self-end pr-2">Action</span>
        </div>

        <div className="space-y-1">
            {workforce[region].map((staff, index) => (
                 <WorkforceInputRow key={`${region}-${index}`} staff={staff} onChange={(field, value) => handleWorkforceChange(region, index, field, value)} onDelete={() => handleDeleteStaff(region, index)}/>
            ))}
        </div>
        <button onClick={() => addStaff(region)} className="mt-4 text-sm text-lime-green-600 dark:text-lime-green-400 hover:underline font-medium">+ Add Staff to {regionName}</button>
    </div>
);


const ChartCard: React.FC<{title: string, children: React.ReactNode, className?: string}> = ({title, children, className}) => (
    <div className={`bg-baby-blue-50/50 dark:bg-gray-800/60 p-4 sm:p-6 rounded-xl shadow-md ${className}`}>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{title}</h3>
        {children}
    </div>
);

const WorkforceTracking: React.FC<WorkforceTrackingProps> = ({ workforce, setWorkforce }) => {
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const handleWorkforceChange = (region: 'north' | 'south', index: number, field: keyof Workforce, value: any) => {
        const updatedRegion = [...workforce[region]];
        updatedRegion[index] = { ...updatedRegion[index], [field]: value };
        setWorkforce({ ...workforce, [region]: updatedRegion });
    };

    const handleDeleteStaff = (region: 'north' | 'south', index: number) => {
        if (window.confirm('Are you sure you want to remove this staff member?')) {
            const updatedRegion = workforce[region].filter((_, i) => i !== index);
            setWorkforce({ ...workforce, [region]: updatedRegion });
        }
    };

    const addStaff = (region: 'north' | 'south') => {
        const newStaff: Workforce = { fte: 0, role: 'CaLD Health Navigator', ethnicity: '', languages: [] };
        setWorkforce({ ...workforce, [region]: [...workforce[region], newStaff] });
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        setSaveError(null);
        try {
            await workforceService.replaceAll(workforce);
            setSaveError(null);
            alert('Workforce data saved successfully.');
        } catch (error) {
            console.error('Error saving workforce:', error);
            const message = error instanceof Error ? error.message : 'Failed to save. Check that the workforce table exists in your database.';
            setSaveError(message);
            alert('Failed to save workforce: ' + message);
        } finally {
            setIsSaving(false);
        }
    };

    const totalFTE = useMemo(() => {
        const northFTE = workforce.north.reduce((sum, staff) => sum + Number(staff.fte || 0), 0);
        const southFTE = workforce.south.reduce((sum, staff) => sum + Number(staff.fte || 0), 0);
        return { north: northFTE, south: southFTE, total: northFTE + southFTE };
    }, [workforce]);

    const chartData = [
        { name: 'Perth North', FTE: totalFTE.north },
        { name: 'Perth South', FTE: totalFTE.south },
    ];
    
    const ethnicityData = useMemo(() => {
        const allStaff = [...workforce.north, ...workforce.south];
        const counts = allStaff.reduce<Record<string, number>>((acc, staff) => {
            if (staff.ethnicity) {
                acc[staff.ethnicity] = (acc[staff.ethnicity] || 0) + 1;
            }
            return acc;
        }, {});

        return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [workforce]);
    
    const languageData = useMemo(() => {
        const allStaff = [...workforce.north, ...workforce.south];
        const counts = allStaff.flatMap(staff => staff.languages).reduce<Record<string, number>>((acc, lang) => {
            acc[lang] = (acc[lang] || 0) + 1;
            return acc;
        }, {});

        return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [workforce]);

    const tooltipStyle = {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(4px)',
        border: '1px solid #e2e8f0',
        borderRadius: '0.5rem',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    };
    const darkTooltipStyle = {
        ...tooltipStyle,
        backgroundColor: 'rgba(31, 41, 55, 0.9)',
        border: '1px solid #4b5563',
    }

    const handleDownloadPDF = () => {
        const doc = new jsPDF();
        const pageTitle = "Workforce Analytics Report";
        const titleX = doc.internal.pageSize.getWidth() / 2;
        
        const headStyles = { fillColor: [132, 204, 22] }; // lime-green-500
    
        doc.setFontSize(18);
        doc.text(pageTitle, titleX, 22, { align: 'center' });
        
        // --- Total FTE Breakdown ---
        doc.setFontSize(14);
        doc.text("Total FTE Breakdown", 14, 40);
        (doc as any).autoTable({
            startY: 45,
            theme: 'grid',
            head: [['Metric', 'FTE']],
            body: [
                ['Total Metropolitan Perth', totalFTE.total.toFixed(2)],
                ['Perth North', totalFTE.north.toFixed(2)],
                ['Perth South', totalFTE.south.toFixed(2)],
            ],
            headStyles,
        });
        
        let finalY = (doc as any).lastAutoTable.finalY;
        
        // --- Workforce Ethnicity ---
        doc.setFontSize(14);
        doc.text("Workforce Ethnicity", 14, finalY + 15);
        (doc as any).autoTable({
            startY: finalY + 20,
            theme: 'striped',
            head: [['Ethnicity', 'Staff Count']],
            body: ethnicityData.map(d => [d.name, d.value]),
            headStyles,
        });
        finalY = (doc as any).lastAutoTable.finalY;
    
        // --- Language Coverage ---
        doc.setFontSize(14);
        doc.text("Language Coverage", 14, finalY + 15);
         (doc as any).autoTable({
            startY: finalY + 20,
            theme: 'striped',
            head: [['Language', 'Number of Speakers']],
            body: languageData.map(d => [d.name, d.value]),
            headStyles,
        });
    
        doc.save('workforce-analytics.pdf');
    };


    return (
        <Card>
            <div className="space-y-8">
                <div className="space-y-6">
                    <StaffRegionEditor region="north" regionName="Perth North" {...{workforce, handleWorkforceChange, handleDeleteStaff, addStaff}} />
                    <StaffRegionEditor region="south" regionName="Perth South" {...{workforce, handleWorkforceChange, handleDeleteStaff, addStaff}} />
                </div>
                
                 {saveError && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-700 dark:text-red-300">
                        {saveError}
                    </div>
                )}
                <div className="flex justify-end">
                    <button
                        onClick={handleSaveChanges}
                        disabled={isSaving}
                        className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-lime-green-500 hover:bg-lime-green-600 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                    >
                        {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : 'Save Changes'}
                    </button>
                </div>


                {/* Analytics */}
                <div className="pt-8 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Workforce Analytics</h2>
                        <button
                            onClick={handleDownloadPDF}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-500 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none"
                            title="Download Analytics as PDF"
                        >
                            <FileDown className="mr-2 h-4 w-4" />
                            Download PDF
                        </button>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        <ChartCard title="Total FTE Breakdown">
                            <div className="flex flex-col justify-center h-80 space-y-6">
                                <div className="text-center">
                                    <p className="text-base text-gray-500 dark:text-gray-400">Total Metropolitan Perth FTE</p>
                                    <p className="text-6xl font-bold text-lime-green-600 dark:text-lime-green-400">{totalFTE.total.toFixed(2)}</p>
                                </div>
                                <div className="flex justify-around text-center">
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Perth North</p>
                                        <p className="text-3xl font-semibold text-baby-blue-500 dark:text-baby-blue-300">{totalFTE.north.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Perth South</p>
                                        <p className="text-3xl font-semibold text-baby-blue-500 dark:text-baby-blue-300">{totalFTE.south.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        </ChartCard>

                        <ChartCard title="FTE Distribution by Region">
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip contentStyle={document.documentElement.classList.contains('dark') ? darkTooltipStyle : tooltipStyle} cursor={{fill: 'rgba(132, 204, 22, 0.1)'}}/>
                                        <Bar dataKey="FTE" fill="#84cc16" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </ChartCard>
                        
                        <ChartCard title="Workforce Ethnicity">
                            <div className="h-80">
                                {ethnicityData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie 
                                                data={ethnicityData} 
                                                dataKey="value" 
                                                nameKey="name" 
                                                cx="50%" 
                                                cy="50%" 
                                                outerRadius={90} 
                                                labelLine={false} 
                                                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                            >
                                                {ethnicityData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                            </Pie>
                                            <Tooltip contentStyle={document.documentElement.classList.contains('dark') ? darkTooltipStyle : tooltipStyle} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">No ethnicity data to display.</div>
                                )}
                            </div>
                        </ChartCard>

                        <ChartCard title="Language Coverage">
                             <div className="h-80">
                                {languageData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={languageData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.2}/>
                                            <XAxis type="number" allowDecimals={false} />
                                            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12, fill: 'currentColor' }} />
                                            <Tooltip cursor={{ fill: 'rgba(132, 204, 22, 0.1)' }} contentStyle={document.documentElement.classList.contains('dark') ? darkTooltipStyle : tooltipStyle} />
                                            <Bar dataKey="value" name="Speakers" fill="#84cc16" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                     <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">No language data to display.</div>
                                )}
                            </div>
                        </ChartCard>

                    </div>
                </div>
            </div>
        </Card>
    );
};

export default WorkforceTracking;
