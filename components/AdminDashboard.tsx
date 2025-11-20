
import React, { useState, useMemo } from 'react';
import { JobCard } from '../types';
import JobCardForm from './JobCardForm';
import { Plus, Trash2, Search, Database, Activity, BarChart3, Clock, ChevronDown, ChevronUp, Printer, TrendingUp, AlertTriangle } from 'lucide-react';

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
    totalPending: jobs.filter(j => j.status === 'Pending').length,
    totalRunning: jobs.filter(j => j.status === 'Running').length,
    totalCompleted: jobs.filter(j => j.status === 'Completed').length,
    totalProductionWeight: jobs.reduce((acc, job) => acc + job.productionData.reduce((p, c) => p + c.netWeight, 0), 0),
    totalSlittingOutput: jobs.reduce((acc, job) => acc + job.slittingData.reduce((s, c) => s + c.netWeight, 0), 0)
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 print:space-y-4">
      {/* Dashboard Stats Cards - Hidden on Print if needed, or kept for report */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group hover:shadow-md transition-all">
           <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <Database size={64} />
           </div>
           <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Jobs</p>
           <h3 className="text-3xl font-bold text-slate-800 mt-2">{stats.totalJobs}</h3>
           <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
               <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-medium">All Time</span>
           </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group hover:shadow-md transition-all">
           <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <Activity size={64} className="text-amber-500"/>
           </div>
           <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Live Status</p>
           <div className="flex gap-4 mt-2">
               <div>
                   <span className="text-2xl font-bold text-amber-500">{stats.totalRunning}</span>
                   <span className="text-xs text-slate-400 block">Running</span>
               </div>
                <div>
                   <span className="text-2xl font-bold text-slate-400">{stats.totalPending}</span>
                   <span className="text-xs text-slate-400 block">Pending</span>
               </div>
           </div>
        </div>

         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group hover:shadow-md transition-all">
           <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <BarChart3 size={64} className="text-indigo-500"/>
           </div>
           <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Production Output</p>
           <h3 className="text-3xl font-bold text-indigo-600 mt-2">{stats.totalProductionWeight.toFixed(3)} <span className="text-base font-medium text-slate-400">kg</span></h3>
           <div className="mt-4 text-xs text-slate-500">
               Total Net Weight Processed
           </div>
        </div>

         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group hover:shadow-md transition-all">
           <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <Activity size={64} className="text-emerald-500"/>
           </div>
           <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Slitting Output</p>
           <h3 className="text-3xl font-bold text-emerald-600 mt-2">{stats.totalSlittingOutput.toFixed(3)} <span className="text-base font-medium text-slate-400">kg</span></h3>
           <div className="mt-4 text-xs text-slate-500">
               Final Product Weight
           </div>
        </div>
      </div>

      {/* Analytics Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 print:border-0 print:shadow-none print:p-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <TrendingUp className="text-slate-900" size={20} />
                      Analytics Dashboard
                  </h3>
                  <p className="text-sm text-slate-500">Top performance metrics by weight</p>
              </div>
              <div className="flex gap-2 no-print">
                  {(['weekly', 'monthly', 'yearly'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setAnalyticsTimeframe(t)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg uppercase tracking-wider transition-all ${
                            analyticsTimeframe === t 
                            ? 'bg-slate-900 text-white' 
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                          {t}
                      </button>
                  ))}
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Top Job Codes */}
              <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Top Job Codes by Weight</h4>
                  <div className="space-y-3">
                      {analyticsData.topJobCodes.length > 0 ? analyticsData.topJobCodes.map(([code, weight], idx) => {
                          const max = analyticsData.topJobCodes[0][1];
                          const percent = (weight / max) * 100;
                          return (
                              <div key={code} className="relative">
                                  <div className="flex justify-between text-sm mb-1">
                                      <span className="font-semibold text-slate-700">{idx + 1}. {code}</span>
                                      <span className="font-bold text-slate-900">{weight.toFixed(3)} kg</span>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                      <div 
                                        className="bg-indigo-500 h-2 rounded-full" 
                                        style={{ width: `${percent}%` }}
                                      ></div>
                                  </div>
                              </div>
                          )
                      }) : (
                          <div className="text-sm text-slate-400 italic py-4 text-center bg-slate-50 rounded-lg">No data available for this period</div>
                      )}
                  </div>
              </div>

               {/* Top Sizes */}
               <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Best Performing Sizes</h4>
                   <div className="space-y-3">
                      {analyticsData.topSizes.length > 0 ? analyticsData.topSizes.map(([size, weight], idx) => {
                          const max = analyticsData.topSizes[0][1];
                          const percent = (weight / max) * 100;
                          return (
                              <div key={size} className="relative">
                                  <div className="flex justify-between text-sm mb-1">
                                      <span className="font-semibold text-slate-700">{idx + 1}. {size}</span>
                                      <span className="font-bold text-slate-900">{weight.toFixed(3)} kg</span>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                      <div 
                                        className="bg-emerald-500 h-2 rounded-full" 
                                        style={{ width: `${percent}%` }}
                                      ></div>
                                  </div>
                              </div>
                          )
                      }) : (
                          <div className="text-sm text-slate-400 italic py-4 text-center bg-slate-50 rounded-lg">No data available for this period</div>
                      )}
                  </div>
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
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none text-sm transition-all"
          />
        </div>
        <div className="flex w-full md:w-auto gap-2">
            <button
            onClick={handlePrint}
            className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-6 py-2.5 rounded-lg transition-all font-medium text-sm"
            >
            <Printer size={18} />
            <span className="hidden sm:inline">Print Report</span>
            </button>
            <button
            onClick={() => setShowForm(true)}
            className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg shadow-lg shadow-slate-900/20 transition-all font-medium text-sm"
            >
            <Plus size={18} />
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
                <div key={job.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:border-blue-300 transition-colors break-inside-avoid">
                    {/* Card Header */}
                    <div className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => toggleExpand(job.id)}>
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className={`p-3 rounded-lg shrink-0 ${
                                job.status === 'Completed' ? 'bg-emerald-100 text-emerald-600' : 
                                job.status === 'Running' ? 'bg-amber-100 text-amber-600' : 
                                'bg-slate-100 text-slate-600'
                            }`}>
                                <Clock size={24} />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <h3 className="text-lg font-bold text-slate-800">#{job.srNo}</h3>
                                    <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-full border ${
                                        job.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                                        job.status === 'Running' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                                        'bg-slate-50 text-slate-600 border-slate-200'
                                    }`}>
                                        {job.status}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-500 font-medium">{job.jobCode}</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4 md:gap-8 text-sm w-full md:w-auto justify-between md:justify-end">
                            <div className="text-left md:text-right">
                                <p className="text-xs text-slate-400 font-semibold uppercase">Target</p>
                                <p className="font-bold text-slate-700">{job.totalQuantity.toFixed(3)} kg</p>
                            </div>
                            <div className="text-left md:text-right">
                                <p className="text-xs text-slate-400 font-semibold uppercase">Size</p>
                                <p className="font-bold text-slate-700">{job.size} mm</p>
                            </div>
                            <div className="hidden sm:block text-left md:text-right">
                                <p className="text-xs text-slate-400 font-semibold uppercase">Date</p>
                                <p className="font-bold text-slate-700">{job.date}</p>
                            </div>
                            
                            <div className="flex gap-2 no-print">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteJob(job.id);
                                    }}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                >
                                    <Trash2 size={18} />
                                </button>
                                <div className="text-slate-400 flex items-center">
                                    {expandedJob === job.id ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Expanded Content */}
                    {(expandedJob === job.id || window.matchMedia('print').matches) && (
                        <div className={`border-t border-slate-100 bg-slate-50/50 p-4 md:p-6 animate-in slide-in-from-top-2 duration-200 ${window.matchMedia('print').matches ? 'block' : ''}`}>
                            {/* Process Summary */}
                            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                    <p className="text-xs text-slate-500 uppercase font-bold">Total Production</p>
                                    <p className="text-xl font-bold text-indigo-600">{prodTotal.toFixed(3)} kg</p>
                                </div>
                                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                    <p className="text-xs text-slate-500 uppercase font-bold">Total Slitting</p>
                                    <p className="text-xl font-bold text-emerald-600">{slitTotal.toFixed(3)} kg</p>
                                </div>
                                <div className={`bg-white p-4 rounded-lg border shadow-sm ${wastage > 0 ? 'border-amber-200 bg-amber-50' : 'border-slate-200'}`}>
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs text-slate-500 uppercase font-bold">Wastage</p>
                                        {wastage > 0 && <AlertTriangle size={14} className="text-amber-500"/>}
                                    </div>
                                    <p className={`text-xl font-bold ${wastage > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                                        {wastage.toFixed(3)} kg
                                    </p>
                                    <p className="text-[10px] text-slate-400">(Prod - Slit)</p>
                                </div>
                            </div>

                            {/* Coil Breakdown Section */}
                            <div className="mb-6 bg-white rounded-lg border border-slate-200 p-4">
                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Slitting Coil Breakdown</h4>
                                <div className="flex flex-wrap gap-4">
                                    {coilBreakdown.map(coil => (
                                        <div key={coil.id} className="flex-1 min-w-[150px] bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-xs font-bold text-emerald-800">{coil.label}</span>
                                                <span className="text-[10px] bg-white px-1.5 py-0.5 rounded text-slate-500 border border-emerald-100">{coil.size}mm</span>
                                            </div>
                                            <p className="text-lg font-bold text-emerald-700">{coil.weight.toFixed(3)} kg</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Live Production Data View */}
                                <div className="bg-white rounded-lg border border-slate-200 p-4">
                                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                                        <h4 className="font-bold text-indigo-700 flex items-center gap-2 text-sm md:text-base">
                                            <Activity size={16}/> Production Data
                                        </h4>
                                        <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-medium whitespace-nowrap">
                                            Net: {job.productionData.reduce((a,c) => a + c.netWeight, 0).toFixed(3)} kg
                                        </span>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto">
                                        <table className="w-full text-xs text-left">
                                            <thead className="text-slate-400 font-medium bg-slate-50 sticky top-0">
                                                <tr>
                                                    <th className="px-2 py-2">Time</th>
                                                    <th className="px-2 py-2">Net</th>
                                                    <th className="px-2 py-2">Meter</th>
                                                    <th className="px-2 py-2">Joints</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 text-slate-600">
                                                {job.productionData.length === 0 ? (
                                                    <tr><td colSpan={4} className="text-center py-4 text-slate-400 italic">No data available</td></tr>
                                                ) : (
                                                    job.productionData.map(d => (
                                                        <tr key={d.id}>
                                                            <td className="px-2 py-2">{d.timestamp.split(',')[1]}</td>
                                                            <td className="px-2 py-2 font-bold text-indigo-600">{d.netWeight.toFixed(3)}</td>
                                                            <td className="px-2 py-2 font-mono">{d.meter || '-'}</td>
                                                            <td className="px-2 py-2">{d.joints}</td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Live Slitting Data View */}
                                <div className="bg-white rounded-lg border border-slate-200 p-4">
                                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                                        <h4 className="font-bold text-emerald-700 flex items-center gap-2 text-sm md:text-base">
                                            <Database size={16}/> Slitting Data
                                        </h4>
                                        <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded font-medium whitespace-nowrap">
                                            Net: {job.slittingData.reduce((a,c) => a + c.netWeight, 0).toFixed(3)} kg
                                        </span>
                                    </div>
                                     <div className="max-h-60 overflow-y-auto">
                                        <table className="w-full text-xs text-left">
                                            <thead className="text-slate-400 font-medium bg-slate-50 sticky top-0">
                                                <tr>
                                                    <th className="px-2 py-2">Sr No</th>
                                                    <th className="px-2 py-2">Coil</th>
                                                    <th className="px-2 py-2">Net Wt</th>
                                                    <th className="px-2 py-2">Meter</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 text-slate-600">
                                                {job.slittingData.length === 0 ? (
                                                    <tr><td colSpan={4} className="text-center py-4 text-slate-400 italic">No data available</td></tr>
                                                ) : (
                                                    job.slittingData.map(d => (
                                                        <tr key={d.id}>
                                                            <td className="px-2 py-2">{d.srNo}</td>
                                                            <td className="px-2 py-2">{job.coils.find(c => c.id === d.coilId)?.label}</td>
                                                            <td className="px-2 py-2 font-bold text-emerald-600">{d.netWeight.toFixed(3)}</td>
                                                            <td className="px-2 py-2 font-mono">{d.meter.toFixed(0)}</td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-6 pt-4 border-t border-slate-200">
                                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Job Configuration</p>
                                <div className="flex flex-wrap gap-2">
                                    <div className="bg-slate-100 px-3 py-1.5 rounded text-xs font-medium text-slate-700 border border-slate-200">
                                        Micron: <span className="text-slate-900 font-bold">{job.micron}</span>
                                    </div>
                                    <div className="bg-slate-100 px-3 py-1.5 rounded text-xs font-medium text-slate-700 border border-slate-200">
                                        Per Roll Meter: <span className="text-slate-900 font-bold">{job.perRollMeter}</span>
                                    </div>
                                </div>
                                {job.note && (
                                    <div className="mt-3 p-3 bg-amber-50 text-amber-800 text-xs rounded border border-amber-100">
                                        <span className="font-bold">Note:</span> {job.note}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )})
        ) : (
            <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <div className="bg-white p-4 rounded-full inline-block shadow-sm mb-4">
                    <Database size={32} className="text-slate-300" />
                </div>
                <h3 className="text-lg font-medium text-slate-900">No Job Cards Found</h3>
                <p className="text-slate-500 mt-1 mb-6">Get started by creating a new job card for production.</p>
                <button
                    onClick={() => setShowForm(true)}
                    className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg transition-all font-medium"
                >
                    <Plus size={18} />
                    <span>Create New Job</span>
                </button>
            </div>
        )}
      </div>

      {showForm && <JobCardForm onClose={() => setShowForm(false)} onSubmit={handleCreateJob} />}
    </div>
  );
};

export default AdminDashboard;
