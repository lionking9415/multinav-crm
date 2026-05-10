import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { HealthActivity, Client, User } from '../types';
import { activityService } from '../services/supabaseService';
import Card from './Card';
import { Download, Filter, Calendar, MapPin, User as UserIcon, Activity, TrendingUp, Users, Target, Award } from 'lucide-react';
import * as XLSX from 'xlsx';

interface StaffPerformanceProps {
  activities: HealthActivity[];
  clients: Client[];
  users: User[];
}

const StaffPerformance: React.FC<StaffPerformanceProps> = ({ activities, clients, users }) => {
  const [selectedStaff, setSelectedStaff] = useState<string>('all');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [dateFilteredActivities, setDateFilteredActivities] = useState<HealthActivity[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [loadTimeMs, setLoadTimeMs] = useState<number | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchStartTime = useRef<number>(0);
  
  // Helper function to calculate days between dates
  const getDaysBetween = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  };

  // Server-side date filtering with debounce
  const fetchActivitiesByDate = useCallback(async (start: string, end: string) => {
    setIsLoadingActivities(true);
    fetchStartTime.current = performance.now();
    console.time('[StaffPerformance] Fetch activities');
    try {
      const data = await activityService.getByDateRange(start, end);
      console.timeEnd('[StaffPerformance] Fetch activities');
      console.log(`[StaffPerformance] Fetched ${data.length} activities for ${start} to ${end}`);
      setDateFilteredActivities(data);
    } catch (err) {
      console.timeEnd('[StaffPerformance] Fetch activities');
      console.error('[StaffPerformance] Failed to fetch activities by date range:', err);
      console.time('[StaffPerformance] Client-side fallback filter');
      const startDate = new Date(start);
      const endDate = new Date(end);
      const fallback = activities.filter(a => {
        const d = new Date(a.date);
        return d >= startDate && d <= endDate;
      });
      console.timeEnd('[StaffPerformance] Client-side fallback filter');
      console.log(`[StaffPerformance] Fallback: ${fallback.length} activities`);
      setDateFilteredActivities(fallback);
    } finally {
      const elapsed = Math.round(performance.now() - fetchStartTime.current);
      setLoadTimeMs(elapsed);
      console.log(`[StaffPerformance] Total fetch time: ${elapsed}ms`);
      setIsLoadingActivities(false);
    }
  }, [activities]);

  // Debounced date range fetch
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      fetchActivitiesByDate(dateRange.start, dateRange.end);
    }, 300);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [dateRange.start, dateRange.end, fetchActivitiesByDate]);

  // Use users from User Management system
  const staffMembers = useMemo(() => {
    return users.map(user => ({
      email: user.email,
      name: user.fullName,
      role: user.role,
      locations: user.assignedLocations
    }));
  }, [users]);

  // Apply staff and location filters on server-fetched data
  const filteredActivities = useMemo(() => {
    const t0 = performance.now();
    const result = dateFilteredActivities.filter(activity => {
      const staffMatch = selectedStaff === 'all' || 
        activity.createdBy === selectedStaff ||
        activity.createdBy === selectedStaff.toLowerCase() ||
        (staffMembers.find(s => s.email === selectedStaff)?.name === activity.createdByName);
      
      const locationMatch = selectedLocation === 'all' || 
        activity.location === selectedLocation;
      
      return staffMatch && locationMatch;
    });
    console.log(`[StaffPerformance] Filter: ${result.length}/${dateFilteredActivities.length} activities in ${Math.round(performance.now() - t0)}ms`);
    return result;
  }, [dateFilteredActivities, selectedStaff, selectedLocation, staffMembers]);

  // Build activity lookup map by staff email — O(N) instead of O(N×M)
  const activityByStaff = useMemo(() => {
    const t0 = performance.now();
    const map = new Map<string, HealthActivity[]>();
    const unattributed: HealthActivity[] = [];

    filteredActivities.forEach(a => {
      const email = a.createdBy || '';
      if (!email || email === 'unknown@multinav.com' || !a.createdByName) {
        unattributed.push(a);
      } else {
        if (!map.has(email)) map.set(email, []);
        map.get(email)!.push(a);
        // Also index by lowercase for case-insensitive matching
        const lc = email.toLowerCase();
        if (lc !== email) {
          if (!map.has(lc)) map.set(lc, []);
          map.get(lc)!.push(a);
        }
      }
    });

    // Also build a name-based index for fallback matching
    const nameMap = new Map<string, HealthActivity[]>();
    filteredActivities.forEach(a => {
      if (a.createdByName) {
        if (!nameMap.has(a.createdByName)) nameMap.set(a.createdByName, []);
        nameMap.get(a.createdByName)!.push(a);
      }
    });

    console.log(`[StaffPerformance] Lookup map: ${map.size} email keys, ${nameMap.size} name keys, ${unattributed.length} unattributed in ${Math.round(performance.now() - t0)}ms`);
    return { map, nameMap, unattributed };
  }, [filteredActivities]);

  // Calculate KPI metrics per staff using the lookup map
  const staffMetrics = useMemo(() => {
    const t0 = performance.now();
    const metrics = new Map<string, any>();
    const dayCount = Math.max(1, getDaysBetween(dateRange.start, dateRange.end));
    
    const staffToShow = selectedStaff === 'all' 
      ? staffMembers 
      : staffMembers.filter(s => s.email === selectedStaff);
    
    staffToShow.forEach(staff => {
      let staffActivities: HealthActivity[];

      if (selectedStaff !== 'all') {
        staffActivities = filteredActivities;
      } else {
        // O(1) lookup instead of O(N) filter
        const byEmail = activityByStaff.map.get(staff.email) || [];
        const byName = activityByStaff.nameMap.get(staff.name) || [];
        // Merge, deduplicate by activity id
        const seen = new Set<string>();
        staffActivities = [];
        for (const a of byEmail) {
          if (!seen.has(a.id)) { seen.add(a.id); staffActivities.push(a); }
        }
        for (const a of byName) {
          if (!seen.has(a.id)) { seen.add(a.id); staffActivities.push(a); }
        }
        // Assign unattributed activities to admin
        if (staff.email === 'admin@multinav.com') {
          for (const a of activityByStaff.unattributed) {
            if (!seen.has(a.id)) { seen.add(a.id); staffActivities.push(a); }
          }
        }
      }
        
      const clientsServed = new Set(staffActivities.map(a => a.clientId));
      
      let navigationCount = 0;
      let servicesCount = 0;
      let dischargeCount = 0;
      let appointmentScheduling = 0;
      let medicareEnrollment = 0;
      let careCoordination = 0;
      let mentalHealthServices = 0;
      let gpServices = 0;

      // Single pass over staffActivities for all counts
      for (const a of staffActivities) {
        navigationCount += (a.navigationAssistance?.length || 0) + (a.otherAssistance ? 1 : 0);
        servicesCount += (a.servicesAccessed?.length || 0) + (a.otherEducation ? 1 : 0);
        if (a.isDischarge) dischargeCount++;
        if (a.navigationAssistance?.includes('Appointment Scheduling')) appointmentScheduling++;
        if (a.navigationAssistance?.includes('Medicare Enrollment')) medicareEnrollment++;
        if (a.navigationAssistance?.includes('Care Coordination')) careCoordination++;
        if (a.servicesAccessed?.includes('Mental Health')) mentalHealthServices++;
        if (a.servicesAccessed?.includes('GP / Primary Care')) gpServices++;
      }
      
      metrics.set(staff.email, {
        ...staff,
        totalActivities: staffActivities.length,
        navigationAssistance: navigationCount,
        servicesAccessed: servicesCount,
        discharges: dischargeCount,
        clientsServed: clientsServed.size,
        averagePerDay: staffActivities.length / dayCount,
        appointmentScheduling,
        medicareEnrollment,
        careCoordination,
        mentalHealthServices,
        gpServices
      });
    });
    
    console.log(`[StaffPerformance] Metrics: ${metrics.size} staff computed in ${Math.round(performance.now() - t0)}ms`);
    return metrics;
  }, [staffMembers, filteredActivities, activityByStaff, dateRange, selectedStaff]);

  // Export to Excel
  const exportToExcel = () => {
    const exportData: any[] = [];
    
    // Prepare data for export
    staffMetrics.forEach((metrics, email) => {
      // Get locations where this staff member has activities
      const staffActivities = filteredActivities.filter(a => 
        a.createdBy === metrics.email || 
        a.createdByName === metrics.name
      );
      const activityLocations = [...new Set(staffActivities.map(a => a.location).filter(Boolean))];
      
      exportData.push({
        'Staff Name': metrics.name,
        'Email': metrics.email,
        'Role': metrics.role.toUpperCase(),
        'Assigned Locations': metrics.locations?.join(', ') || 'Not specified',
        'Activity Locations': activityLocations.length > 0 ? activityLocations.join(', ') : 'No activities',
        'Total Activities': metrics.totalActivities,
        'Navigation Assistance': metrics.navigationAssistance,
        'Services Accessed': metrics.servicesAccessed,
        'Discharges': metrics.discharges,
        'Clients Served': metrics.clientsServed,
        'Average Per Day': metrics.averagePerDay.toFixed(1),
        'Appointment Scheduling': metrics.appointmentScheduling,
        'Medicare Enrollment': metrics.medicareEnrollment,
        'Care Coordination': metrics.careCoordination,
        'Mental Health Services': metrics.mentalHealthServices,
        'GP Services': metrics.gpServices
      });
    });

    // Add detailed activity log
    const detailedData = filteredActivities.map(activity => {
      const client = clients.find(c => c.id === activity.clientId);
      return {
        'Date': activity.date,
        'Staff Name': activity.createdByName || 'Unknown',
        'Staff Email': activity.createdBy || 'Unknown',
        'Location': activity.location || 'Not specified',
        'Client ID': activity.clientId,
        'Client Name': client?.fullName || 'Unknown',
        'Navigation Assistance': activity.navigationAssistance.join(', '),
        'Services Accessed': activity.servicesAccessed.join(', '),
        'Is Discharge': activity.isDischarge ? 'Yes' : 'No',
        'Follow Up Actions': activity.followUpActions
      };
    });

    // Create workbook with multiple sheets
    const wb = XLSX.utils.book_new();
    
    // Add summary sheet
    const summarySheet = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Staff KPI Summary');
    
    // Add detailed activity sheet
    const detailSheet = XLSX.utils.json_to_sheet(detailedData);
    XLSX.utils.book_append_sheet(wb, detailSheet, 'Detailed Activities');
    
    // Save the file
    const fileName = `Staff_Performance_Report_${dateRange.start}_to_${dateRange.end}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    const totalActivities = filteredActivities.length;
    const totalClients = new Set(filteredActivities.map(a => a.clientId)).size;
    const totalStaff = new Set(filteredActivities.map(a => a.createdBy)).size;
    
    return {
      totalActivities,
      totalClients,
      totalStaff,
      averagePerStaff: totalStaff > 0 ? (totalActivities / totalStaff).toFixed(1) : '0'
    };
  }, [filteredActivities]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Staff Performance Dashboard</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Track staff KPIs and health navigation activities
            </p>
          </div>
          <button
            onClick={exportToExcel}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-5 h-5" />
            <span>Export to Excel</span>
          </button>
        </div>
      </Card>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Staff Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Staff Member
            </label>
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-lime-green-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
              <option value="all">All Staff</option>
              {staffMembers.map(staff => (
                <option key={staff.email} value={staff.email}>
                  {staff.name} ({staff.role})
                </option>
              ))}
            </select>
          </div>

          {/* Location Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Location
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-lime-green-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
              <option value="all">All Locations</option>
              <option value="Canning">Canning</option>
              <option value="Gosnells">Gosnells</option>
              <option value="Mandurah">Mandurah</option>
              <option value="Stirling">Stirling</option>
              <option value="Swan">Swan</option>
              <option value="Wanneroo">Wanneroo</option>
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-lime-green-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-lime-green-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>
      </Card>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Activities</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{overallStats.totalActivities}</p>
            </div>
            <Activity className="w-8 h-8 text-lime-green-500" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Clients Served</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{overallStats.totalClients}</p>
            </div>
            <Users className="w-8 h-8 text-baby-blue-500" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Staff</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{overallStats.totalStaff}</p>
            </div>
            <UserIcon className="w-8 h-8 text-purple-500" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg per Staff</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{overallStats.averagePerStaff}</p>
            </div>
            <Target className="w-8 h-8 text-orange-500" />
          </div>
        </Card>
      </div>

      {/* Staff Performance Table */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Staff Performance Metrics</h3>
          <div className="flex items-center space-x-3">
            {isLoadingActivities && (
              <span className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">Loading activities...</span>
            )}
            {!isLoadingActivities && loadTimeMs !== null && (
              <span className="text-xs text-gray-400 dark:text-gray-500">Loaded in {loadTimeMs}ms &middot; {filteredActivities.length} activities</span>
            )}
          </div>
        </div>
        
        {/* Admin Activities Note */}
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Note:</strong> Activities created by System Administrators are shown separately below for tracking purposes.
            Admin activities are typically test data or system maintenance activities.
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Staff Member</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Role</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Total Activities</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Navigation</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Services</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Discharges</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Clients</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Avg/Day</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(staffMetrics.values()).map((metrics) => (
                  <tr key={metrics.email} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{metrics.name}</div>
                        <div className="text-xs text-gray-500">{metrics.email}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        metrics.role === 'admin' 
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' 
                          : metrics.role === 'coordinator'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                      }`}>
                        {metrics.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-semibold dark:text-gray-100">{metrics.totalActivities}</td>
                    <td className="py-3 px-4 text-center dark:text-gray-200">{metrics.navigationAssistance}</td>
                    <td className="py-3 px-4 text-center dark:text-gray-200">{metrics.servicesAccessed}</td>
                    <td className="py-3 px-4 text-center dark:text-gray-200">{metrics.discharges}</td>
                    <td className="py-3 px-4 text-center dark:text-gray-200">{metrics.clientsServed}</td>
                    <td className="py-3 px-4 text-center dark:text-gray-200">{metrics.averagePerDay.toFixed(1)}</td>
                  </tr>
              ))}
            </tbody>
          </table>
          {staffMetrics.size === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No activity data available for the selected period
            </div>
          )}
        </div>
      </Card>

      {/* Top Performers */}
      <Card>
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center">
          <Award className="w-6 h-6 text-yellow-500 mr-2" />
          Top Performers
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from(staffMetrics.values())
            .sort((a, b) => b.totalActivities - a.totalActivities)
            .slice(0, 3)
            .map((metrics, index) => (
              <div key={metrics.email} className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-gray-800 dark:to-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold text-yellow-600">#{index + 1}</span>
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <h4 className="font-semibold text-gray-800 dark:text-gray-100">{metrics.name}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{metrics.role}</p>
                <div className="mt-2 space-y-1">
                  <p className="text-sm dark:text-gray-200"><span className="font-medium">Activities:</span> {metrics.totalActivities}</p>
                  <p className="text-sm dark:text-gray-200"><span className="font-medium">Clients:</span> {metrics.clientsServed}</p>
                  <p className="text-sm dark:text-gray-200"><span className="font-medium">Avg/Day:</span> {metrics.averagePerDay.toFixed(1)}</p>
                </div>
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
};

export default StaffPerformance;
