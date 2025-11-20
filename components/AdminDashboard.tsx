import React, { useState, useMemo } from 'react';
import { JobCard, JobStatus } from '../types';
import JobCardForm from './JobCardForm';
import { Plus, Trash2, Search, Database, Activity, BarChart3, Clock, ChevronDown, ChevronUp, Printer, TrendingUp, AlertTriangle, CheckCircle2, PlayCircle } from 'lucide-react';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

interface AdminDashboardProps {
  jobs: JobCard[];
  onCreateJob: (job: JobCard) => void;
  onUpdateJob: (job: JobCard) => void;
  onDeleteJob: (id: string) => void;
}

type TimeFrame = 'weekly' | 'monthly' | 'yearly';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ jobs, onCreateJob, onUpdateJob, onDeleteJob }) => {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<TimeFrame>('monthly');

  const handleCreateJob = (newJob: JobCard) => {
    onCreateJob(newJob);
    setShowForm(false);
  };

  const handleDeleteJob = (id: string) => {
    if (confirm('Are you sure you want to delete this job card? This action cannot be undone.')) {
      onDeleteJob(id);
    }
  };

  const handleSystemReset = async () => {
      if(confirm("DANGER: This will delete ALL job cards from the database. Are you sure?")) {
        const jobsRef = jobs.map(j => j.id);
        for(const id of jobsRef) {
            await deleteDoc(doc(db, 'jobs', id));
        }
        alert("System Database Cleared.");
      }
  }

  const toggleExpand = (id: string) => {
      setExpandedJob(expandedJob === id ? null : id);
  }

  const handlePrint = () => {
      window.print();
  }

  const filteredJobs = jobs.filter(j => 
    j.srNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    j.jobCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- Analytics Logic ---
  const analyticsData = useMemo(() => {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

      const cutoffDate = analyticsTimeframe === 'weekly' ? oneWeekAgo : 
                         analyticsTimeframe === 'monthly' ? oneMonthAgo : oneYearAgo;

      const relevantJobs = jobs.filter(j => new Date(j.createdAt) >= cutoffDate);

      // Group by Job Code
      const jobCodeMap = new Map<string, number>();
      // Group by Size
      const sizeMap = new Map<string, number>();

      relevantJobs.forEach(job => {
          const totalNet = job.productionData.reduce((acc, curr) => acc + curr.netWeight, 0);
          
          if (totalNet > 0) {
            // By Job Code
            jobCodeMap.set(job.jobCode, (jobCodeMap.get(job.jobCode) || 0) + totalNet);
            
            // By Size
            const sizeKey = `${job.size}mm`;
            sizeMap.set(sizeKey, (sizeMap.get(sizeKey) || 0) + totalNet);
          }
      });

      const topJobCodes = Array.from(jobCodeMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);

      const topSizes = Array.from(sizeMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);

      return { topJobCodes, topSizes };
  }, [jobs, analyticsTimeframe]);

  const stats = {
    totalJobs: jobs.length,
    totalProductionWeight: jobs.reduce((acc, job) => acc + job.productionData.reduce((p, c) => p + c.netWeight, 0), 0),
    totalSlittingOutput: jobs.reduce((acc, job) => acc + job.slittingData.reduce((s, c) => s + c.netWeight, 0), 0),
    liveRunning: jobs.filter(j => j.productionStatus === 'Running' || j.slittingStatus === 'Running').length
  };

  const renderStatusBadge = (status: JobStatus | undefined, type: 'production' | 'slitting') => {
      const s = status || 'Pending';
      const colors = {
          'Pending': 'bg-slate-100 text-slate-500 border-slate-200',
          'Running': 'bg-amber-50 text-amber-700 border-amber-200',
          'Completed': 'bg-emerald-50 text-emerald-700 border-emerald-200'
      };
      const labels = {
          'production': 'Prod',
          'slitting': 'Slit'
      };

      return (
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${colors[s]}`}>
            <div className={`w-2 h-2 rounded-full ${s === 'Completed' ? 'bg-emerald-500' : s === 'Running' ? 'bg-amber-500' : 'bg-slate-400'}`}></div>
            <span className="text-xs font-bold uppercase tracking-wide">{labels[type]}: {s}</span>
        </div>
      );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 print:space-y-4 pb-20">
      {/* Dashboard Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        {/* Total Jobs - PURPLE */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-purple-100 relative overflow-hidden group hover:shadow-md transition-all">
           <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <Database size={64} className="text-purple-600" />
           </div>
           <p className="text-purple-600/70 text-xs font-extrabold uppercase tracking-wider">Total Jobs</p>
           <h3 className="text-3xl font-black text-purple-700 mt-2">{stats.totalJobs}</h3>
           <div className="mt-4 h-1 w-full bg-purple-50 rounded-full overflow-hidden">
               <div className="h-full bg-purple-500 w-3/4"></div>
           </div>
        </div>

        {/* Live Status - GREEN */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-emerald-100 relative overflow-hidden group hover:shadow-md transition-all">
           <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <Activity size={64} className="text-emerald-600"/>
           </div>
           <p className="text-emerald-600/70 text-xs font-extrabold uppercase tracking-wider">Live Active</p>
           <h3 className="text-3xl font-black text-emerald-700 mt-2">{stats.liveRunning}</h3>
           <div className="mt-4 text-xs text-emerald-600 font-medium flex items-center gap-1">
               <Activity size={14} className="animate-pulse"/> Jobs Currently Running
           </div>
        </div>

         {/* Production Output - BLUE */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100 relative overflow-hidden group hover:shadow-md transition-all">
           <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <BarChart3 size={64} className="text-blue-600"/>
           </div>
           <p className="text-blue-600/70 text-xs font-extrabold uppercase tracking-wider">Production Output</p>
           <h3 className="text-3xl font-black text-blue-700 mt-2">{stats.totalProductionWeight.toFixed(3)} <span className="text-base font-semibold opacity-60">kg</span></h3>
           <div className="mt-4 h-1 w-full bg-blue-50 rounded-full overflow-hidden">
               <div className="h-full bg-blue-500 w-1/2"></div>
           </div>
        </div>

         {/* Slitting Output - ORANGE */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-orange-100 relative overflow-hidden group hover:shadow-md transition-all">
           <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <Activity size={64} className="text-orange-500"/>
           </div>
           <p className="text-orange-600/70 text-xs font-extrabold uppercase tracking-wider">Slitting Output</p>
           <h3 className="text-3xl font-black text-orange-600 mt-2">{stats.totalSlittingOutput.toFixed(3)} <span className="text-base font-semibold opacity-60">kg</span></h3>
           <div className="mt-4 h-1 w-full bg-orange-50 rounded-full overflow-hidden">
               <div className="h-full bg-orange-500 w-1/2"></div>
           </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search Job Code or Sr No..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none text-sm transition-all font-medium"
          />
        </div>
        <div className="flex w-full md:w-auto gap-2">
            <button
            onClick={handlePrint}
            className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-6 py-2.5 rounded-lg transition-all font-bold text-xs uppercase tracking-wide"
            >
            <Printer size={16} />
            <span className="hidden sm:inline">Print Report</span>
            </button>
            <button
            onClick={() => setShowForm(true)}
            className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg shadow-lg shadow-slate-900/20 transition-all font-bold text-xs uppercase tracking-wide"
            >
            <Plus size={16} />
            <span>Create Job</span>
            </button>
        </div>
      </div>

      {/* Data Table / Cards */}
      <div className="space-y-4">
        <div className="print-only hidden mb-4">
            <h1 className="text-2xl font-bold">Production Report</h1>
            <p className="text-sm text-slate-500">Generated on {new Date().toLocaleString()}</p>
        </div>

        {filteredJobs.length > 0 ? (
            filteredJobs.map(job => {
                const prodTotal = job.productionData.reduce((acc, curr) => acc + curr.netWeight, 0);
                const slitTotal = job.slittingData.reduce((acc, curr) => acc + curr.netWeight, 0);
                const wastage = prodTotal - slitTotal;

                // Calculate Coil Breakdown
                const coilBreakdown = job.coils.map(coil => {
                    const weight = job.slittingData
                        .filter(d => d.coilId === coil.id)
                        .reduce((acc, curr) => acc + curr.netWeight, 0);
                    return { ...coil, weight };
                });

                return (
                <div key={job.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:border-blue-400 transition-all duration-300 break-inside-avoid">
                    {/* Card Header */}
                    <div className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors" onClick={() => toggleExpand(job.id)}>
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="p-3 rounded-xl bg-slate-50 text-slate-400 border border-slate-100">
                                <Clock size={24} />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-baseline gap-3 flex-wrap">
                                    <h3 className="text-xl font-black text-slate-800 tracking-tight">#{job.srNo}</h3>
                                    <span className="text-sm font-bold text-slate-400">{job.jobCode}</span>
                                </div>
                                {/* Dual Status Badges */}
                                <div className="flex gap-2 mt-2">
                                    {renderStatusBadge(job.productionStatus, 'production')}
                                    {renderStatusBadge(job.slittingStatus, 'slitting')}
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4 md:gap-8 text-sm w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 mt-2 md:mt-0">
                            <div className="text-left md:text-right">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Target</p>
                                <p className="font-bold text-slate-700 text-lg">{job.totalQuantity.toFixed(0)} <span className="text-xs font-normal text-slate-400">kg</span></p>
                            </div>
                            <div className="text-left md:text-right">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Size</p>
                                <p className="font-bold text-slate-700 text-lg">{job.size} <span className="text-xs font-normal text-slate-400">mm</span></p>
                            </div>
                            <div className="hidden sm:block text-left md:text-right">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Date</p>
                                <p className="font-bold text-slate-700">{job.date}</p>
                            </div>
                            
                            <div className="flex gap-2 no-print">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteJob(job.id);
                                    }}
                                    className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                >
                                    <Trash2 size={20} />
                                </button>
                                <div className="text-slate-300 hover:text-slate-600 transition-colors flex items-center">
                                    {expandedJob === job.id ? <ChevronUp size={24}/> : <ChevronDown size={24}/>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Expanded Content */}
                    {(expandedJob === job.id || window.matchMedia('print').matches) && (
                        <div className={`border-t border-slate-100 bg-slate-50/30 p-4 md:p-6 animate-in slide-in-from-top-2 duration-200 ${window.matchMedia('print').matches ? 'block' : ''}`}>
                            {/* Process Summary */}
                            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm">
                                    <p className="text-xs text-blue-500 uppercase font-bold tracking-wide mb-1">Total Production</p>
                                    <p className="text-2xl font-black text-blue-700">{prodTotal.toFixed(3)} kg</p>
                                </div>
                                <div className="bg-white p-5 rounded-xl border border-orange-100 shadow-sm">
                                    <p className="text-xs text-orange-500 uppercase font-bold tracking-wide mb-1">Total Slitting</p>
                                    <p className="text-2xl font-black text-orange-600">{slitTotal.toFixed(3)} kg</p>
                                </div>
                                <div className={`bg-white p-5 rounded-xl border shadow-sm ${wastage > 0 ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200'}`}>
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wide mb-1">Wastage</p>
                                        {wastage > 0 && <AlertTriangle size={14} className="text-amber-500"/>}
                                    </div>
                                    <p className={`text-2xl font-black ${wastage > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                                        {wastage.toFixed(3)} kg
                                    </p>
                                </div>
                            </div>

                            {/* Coil Breakdown Section */}
                            <div className="mb-6 bg-white rounded-xl border border-slate-200 p-5">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Slitting Coil Breakdown</h4>
                                <div className="flex flex-wrap gap-4">
                                    {coilBreakdown.map(coil => (
                                        <div key={coil.id} className="flex-1 min-w-[150px] bg-slate-50 rounded-lg p-4 border border-slate-100">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-xs font-bold text-slate-800">{coil.label}</span>
                                                <span className="text-[10px] bg-white px-1.5 py-0.5 rounded text-slate-500 border border-slate-200 font-mono">{coil.size}mm</span>
                                            </div>
                                            <p className="text-lg font-bold text-slate-600">{coil.weight.toFixed(3)} <span className="text-xs font-normal text-slate-400">kg</span></p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Live Production Data View */}
                                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                                        <h4 className="font-bold text-blue-700 flex items-center gap-2">
                                            <Activity size={18}/> Production Logs
                                        </h4>
                                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-bold whitespace-nowrap">
                                            {job.productionData.length} Entries
                                        </span>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto pr-2">
                                        <table className="w-full text-xs text-left">
                                            <thead className="text-slate-400 font-medium bg-slate-50 sticky top-0">
                                                <tr>
                                                    <th className="px-2 py-2 rounded-l">Time</th>
                                                    <th className="px-2 py-2 text-blue-600">Net Weight</th>
                                                    <th className="px-2 py-2">Meter</th>
                                                    <th className="px-2 py-2 rounded-r">Joints</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50 text-slate-600">
                                                {job.productionData.length === 0 ? (
                                                    <tr><td colSpan={4} className="text-center py-6 text-slate-400 italic">No logs yet</td></tr>
                                                ) : (
                                                    job.productionData.map(d => (
                                                        <tr key={d.id} className="hover:bg-blue-50/30 transition-colors">
                                                            <td className="px-2 py-2.5">{d.timestamp.split(',')[1]}</td>
                                                            <td className="px-2 py-2.5 font-bold text-blue-600">{d.netWeight.toFixed(3)}</td>
                                                            <td className="px-2 py-2.5 font-mono text-slate-500">{d.meter || '-'}</td>
                                                            <td className="px-2 py-2.5">{d.joints}</td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Live Slitting Data View */}
                                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                                        <h4 className="font-bold text-orange-600 flex items-center gap-2">
                                            <Database size={18}/> Slitting Logs
                                        </h4>
                                        <span className="text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded font-bold whitespace-nowrap">
                                             {job.slittingData.length} Entries
                                        </span>
                                    </div>
                                     <div className="max-h-60 overflow-y-auto pr-2">
                                        <table className="w-full text-xs text-left">
                                            <thead className="text-slate-400 font-medium bg-slate-50 sticky top-0">
                                                <tr>
                                                    <th className="px-2 py-2 rounded-l">Sr No</th>
                                                    <th className="px-2 py-2">Coil</th>
                                                    <th className="px-2 py-2 text-orange-600">Net Wt</th>
                                                    <th className="px-2 py-2 rounded-r">Meter</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50 text-slate-600">
                                                {job.slittingData.length === 0 ? (
                                                    <tr><td colSpan={4} className="text-center py-6 text-slate-400 italic">No logs yet</td></tr>
                                                ) : (
                                                    job.slittingData.map(d => (
                                                        <tr key={d.id} className="hover:bg-orange-50/30 transition-colors">
                                                            <td className="px-2 py-2.5 font-mono">{d.srNo}</td>
                                                            <td className="px-2 py-2.5 text-slate-500">{job.coils.find(c => c.id === d.coilId)?.label}</td>
                                                            <td className="px-2 py-2.5 font-bold text-orange-600">{d.netWeight.toFixed(3)}</td>
                                                            <td className="px-2 py-2.5 font-mono text-slate-500">{d.meter.toFixed(0)}</td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-6 pt-4 border-t border-slate-200">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-3">Job Metadata</p>
                                <div className="flex flex-wrap gap-2">
                                    <div className="bg-slate-50 px-3 py-1.5 rounded text-xs font-medium text-slate-500 border border-slate-100">
                                        Micron: <span className="text-slate-900 font-bold">{job.micron}</span>
                                    </div>
                                    <div className="bg-slate-50 px-3 py-1.5 rounded text-xs font-medium text-slate-500 border border-slate-100">
                                        Per Roll Meter: <span className="text-slate-900 font-bold">{job.perRollMeter}</span>
                                    </div>
                                </div>
                                {job.note && (
                                    <div className="mt-3 p-3 bg-yellow-50 text-yellow-800 text-xs rounded border border-yellow-100 flex items-start gap-2">
                                        <AlertTriangle size={14} className="shrink-0 mt-0.5"/>
                                        <span><span className="font-bold">Note:</span> {job.note}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )})
        ) : (
            <div className="text-center py-24 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="bg-slate-50 p-4 rounded-full inline-block mb-4">
                    <Database size={32} className="text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">No Job Cards Found</h3>
                <p className="text-slate-400 mt-1 mb-6 text-sm">Get started by creating a new job card for production.</p>
                <button
                    onClick={() => setShowForm(true)}
                    className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg transition-all font-bold text-xs uppercase tracking-wide"
                >
                    <Plus size={16} />
                    <span>Create New Job</span>
                </button>
            </div>
        )}
      </div>

      {/* Hidden Reset Button */}
      <button onClick={handleSystemReset} className="fixed bottom-4 right-4 opacity-0 hover:opacity-100 bg-red-600 text-white p-2 rounded text-xs z-50">
          Reset DB
      </button>

      {showForm && <JobCardForm onClose={() => setShowForm(false)} onSubmit={handleCreateJob} />}
    </div>
  );
};

export default AdminDashboard;