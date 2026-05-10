import React, { useMemo } from 'react';
import type { Client, HealthActivity, WorkforceData, ProgramResource } from '../types';
import Card from './Card';
import { Users, HeartPulse, Briefcase, FolderKanban, PlusCircle } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

interface DashboardProps {
  clients: Client[];
  activities: HealthActivity[];
  workforce: WorkforceData;
  resources: ProgramResource[];
  setActiveView: (view: string) => void;
  isDarkMode: boolean;
}

const COLORS = [
    '#84cc16', '#38bdf8', '#f97316', '#a855f7', '#ef4444', '#14b8a6', '#eab308',
    '#ec4899', '#6366f1', '#22c55e', '#f43f5e', '#0ea5e9', '#8b5cf6', '#10b981'
];

const Dashboard: React.FC<DashboardProps> = ({ clients, activities, workforce, resources, setActiveView, isDarkMode }) => {
    
    const totalClients = clients.length;
    const totalActivities = activities.length;
    const totalFTE = useMemo(() => {
        const northFTE = workforce.north.reduce((sum, staff) => sum + Number(staff.fte || 0), 0);
        const southFTE = workforce.south.reduce((sum, staff) => sum + Number(staff.fte || 0), 0);
        return (northFTE + southFTE).toFixed(2);
    }, [workforce]);
    const totalResources = resources.length;

    const ethnicityData = useMemo(() => {
        const counts = clients.reduce((acc: Record<string, number>, client) => {
            const ethnicity = client.ethnicity || "Unknown";
            acc[ethnicity] = (acc[ethnicity] || 0) + 1;
            return acc;
        }, {});

        const sorted = Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
        
        // Show top 8 ethnicities, group the rest into "Other"
        const TOP_N = 8;
        if (sorted.length <= TOP_N) return sorted;
        
        const top = sorted.slice(0, TOP_N);
        const otherTotal = sorted.slice(TOP_N).reduce((sum, item) => sum + item.value, 0);
        if (otherTotal > 0) {
            top.push({ name: `Other (${sorted.length - TOP_N} groups)`, value: otherTotal });
        }
        return top;
    }, [clients]);

    const navigationSupportData = useMemo(() => {
        const counts = activities.flatMap(a => a.navigationAssistance).reduce((acc: Record<string, number>, support) => {
            acc[support] = (acc[support] || 0) + 1;
            return acc;
        }, {});

        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    }, [activities]);

    const { populationPyramidData, maxPopulation } = useMemo(() => {
        if (!clients || clients.length === 0) return { populationPyramidData: [], maxPopulation: 0 };

        const ageBracketOrder = ['0-9', '10-19', '20-29', '30-39', '40-49', '50-59', '60-69', '70+'];
        const ageBrackets: Record<string, { male: number; female: number }> = ageBracketOrder.reduce((acc, bracket) => {
            acc[bracket] = { male: 0, female: 0 };
            return acc;
        }, {} as Record<string, { male: number; female: number }>);
        
        clients.forEach(client => {
            if (client.age === null || client.age === undefined) return;

            let bracket: string;
            if (client.age < 10) bracket = '0-9';
            else if (client.age < 20) bracket = '10-19';
            else if (client.age < 30) bracket = '20-29';
            else if (client.age < 40) bracket = '30-39';
            else if (client.age < 50) bracket = '40-49';
            else if (client.age < 60) bracket = '50-59';
            else if (client.age < 70) bracket = '60-69';
            else bracket = '70+';

            if (client.sex === 'Male') {
                ageBrackets[bracket].male++;
            } else if (client.sex === 'Female') {
                ageBrackets[bracket].female++;
            }
        });

        const data = ageBracketOrder.map(ageGroup => ({
            ageGroup,
            male: -ageBrackets[ageGroup].male,
            female: ageBrackets[ageGroup].female,
        }));
        
        const maxVal = Math.max(...data.map(d => Math.max(Math.abs(d.male), d.female)));
        
        return { populationPyramidData: data, maxPopulation: Math.ceil(maxVal * 1.1) };
    }, [clients]);

    const StatCard = ({ icon, title, value, colorClass }: { icon: React.ReactNode, title: string, value: string | number, colorClass: string }) => (
        <Card className="flex items-center p-4">
            <div className={`p-3 rounded-full ${colorClass} mr-4`}>
                {icon}
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
            </div>
        </Card>
    );
    
    const tooltipStyle = {
        backgroundColor: isDarkMode ? 'rgba(31,41,55,0.8)' : 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(2px)',
        border: '1px solid #e2e8f0',
        borderRadius: '0.5rem'
    };

    return (
        <div className="space-y-8">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={<Users className="h-6 w-6 text-white"/>} title="Total Clients" value={totalClients} colorClass="bg-baby-blue-400" />
                <StatCard icon={<HeartPulse className="h-6 w-6 text-white"/>} title="Logged Activities" value={totalActivities} colorClass="bg-red-400" />
                <StatCard icon={<Briefcase className="h-6 w-6 text-white"/>} title="Total Workforce (FTE)" value={totalFTE} colorClass="bg-yellow-400" />
                <StatCard icon={<FolderKanban className="h-6 w-6 text-white"/>} title="Program Resources" value={totalResources} colorClass="bg-green-400" />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <button onClick={() => setActiveView('demographics')} className="w-full text-left p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow flex items-center space-x-4">
                    <PlusCircle className="h-10 w-10 text-lime-green-500" />
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Add New Client</h3>
                        <p className="text-gray-500 dark:text-gray-400">Onboard a new client into the system.</p>
                    </div>
                </button>
                <button onClick={() => setActiveView('activities')} className="w-full text-left p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow flex items-center space-x-4">
                    <PlusCircle className="h-10 w-10 text-lime-green-500" />
                     <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Log New Activity</h3>
                        <p className="text-gray-500 dark:text-gray-400">Record a new health navigation interaction.</p>
                    </div>
                </button>
            </div>


            {/* Charts */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
                <Card className="lg:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Client Ethnicity Distribution</h3>
                     {ethnicityData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                            <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <Pie data={ethnicityData} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={80} innerRadius={35} labelLine={true} label={(props: any) => props.percent >= 0.05 ? `${(props.percent * 100).toFixed(0)}%` : ''}>
                                    {ethnicityData.map((_entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(value, name) => [`${value} client${Number(value) !== 1 ? 's' : ''} (${totalClients > 0 ? (Number(value) / totalClients * 100).toFixed(1) : 0}%)`, name]} contentStyle={tooltipStyle} />
                                <Legend wrapperStyle={{ fontSize: '12px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">No client data to display.</div>
                    )}
                </Card>
                <Card className="lg:col-span-3">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Top 5 Navigation Support Accessed</h3>
                     {navigationSupportData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={navigationSupportData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.2}/>
                                <XAxis type="number" allowDecimals={false} />
                                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12, fill: 'currentColor' }} />
                                <Tooltip cursor={{ fill: 'rgba(236, 252, 203, 0.3)' }} contentStyle={tooltipStyle} />
                                <Bar dataKey="value" name="Times Accessed" fill="#84cc16" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                         <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">No activity data to display.</div>
                    )}
                </Card>

                {/* Population Pyramid Card */}
                <Card className="lg:col-span-5">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Client Population Pyramid</h3>
                    {clients.length > 0 && populationPyramidData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart
                                data={populationPyramidData}
                                layout="vertical"
                                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={isDarkMode ? 0.2 : 0.4} />
                                <XAxis 
                                    type="number" 
                                    domain={[-maxPopulation, maxPopulation]}
                                    tickFormatter={(value) => `${Math.abs(value)}`}
                                    allowDataOverflow={true}
                                />
                                <YAxis 
                                    type="category" 
                                    dataKey="ageGroup" 
                                    width={40}
                                    tick={{ fontSize: 12, fill: 'currentColor' }}
                                />
                                <Tooltip 
                                    contentStyle={tooltipStyle}
                                    formatter={(value: number, name: string) => [Math.abs(value), name.charAt(0).toUpperCase() + name.slice(1)]}
                                    cursor={{fill: isDarkMode ? 'rgba(132, 204, 22, 0.1)' : 'rgba(236, 252, 203, 0.3)'}}
                                />
                                <Legend />
                                <Bar dataKey="male" fill="#38bdf8" name="Male" />
                                <Bar dataKey="female" fill="#f87171" name="Female" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[350px] text-gray-500 dark:text-gray-400">No client demographic data to display.</div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default Dashboard;
