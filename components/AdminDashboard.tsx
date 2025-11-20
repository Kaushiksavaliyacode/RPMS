
import React, { useState, useMemo } from 'react';
import { JobCard, JobStatus } from '../types';
import JobCardForm from './JobCardForm';
import { Plus, Trash2, Search, Database, Activity, BarChart3, Clock, ChevronDown, ChevronUp, Printer, TrendingUp, AlertTriangle, Calendar, Award, Scale, Layers, Ruler, Weight } from 'lucide-react';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

interface AdminDashboardProps {
  jobs: JobCard[];
  onCreateJob: (job: JobCard) => void;
  onUpdateJob: (job: JobCard) => void;
  onDeleteJob: (id: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ jobs, onCreateJob, onUpdateJob, onDeleteJob }) => {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

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

  // --- Advanced Analytics Calculation ---
  const analytics = useMemo(() => {
      const prodBySize: Record<string, number> = {};
      const prodByJob: Record<string, number> = {};
      const slitBySize: Record<string, number> = {};
      
      // Datewise Aggregation
      const dateWise: Record<string, { prod: number, slit: number, count: number }> = {};

      let totalProd = 0;
      let totalSlit = 0;

      jobs.forEach(job => {
         const jobProdTotal = job.productionData.reduce((sum, d) => sum + d.netWeight, 0);
         const jobSlitTotal = job.slittingData.reduce((sum, d) => sum + d.netWeight, 0);
         
         totalProd += jobProdTotal;
         totalSlit += jobSlitTotal;

         // Top Production Job Code
         if (jobProdTotal > 0) {
            prodByJob[job.jobCode] = (prodByJob[job.jobCode] || 0) + jobProdTotal;
            prodBySize[job.size] = (prodBySize[job.size] || 0) + jobProdTotal;
         }

         // Top Slitting Size
         job.slittingData.forEach(d => {
             const coil = job.coils.find(c => c.id === d.coilId);
             if(coil) {
                 slitBySize[coil.size] = (slitBySize[coil.size] || 0) + d.netWeight;
             }
             
             // Datewise Slitting Logic
             const date = d.timestamp.split(',')[0].trim(); 
             if(!dateWise[date]) dateWise[date] = { prod: 0, slit: 0, count: 0 };
             dateWise[date].slit += d.netWeight;
         });

         // Datewise Production Logic
         job.productionData.forEach(d => {
             const date = d.timestamp.split(',')[0].trim();
             if(!dateWise[date]) dateWise[date] = { prod: 0, slit: 0, count: 0 };
             dateWise[date].prod += d.netWeight;
             dateWise[date].count += 1;
         });
      });

      const topJob = Object.entries(prodByJob).sort((a,b) => b[1] - a[1])[0] || ['-', 0];
      const topProdSize = Object.entries(prodBySize).sort((a,b) => b[1] - a[1])[0] || ['-', 0];
      const topSlitSize = Object.entries(slitBySize).sort((a,b) => b[1] - a[1])[0] || ['-', 0];

      // Convert datewise to array and sort desc by date
      const dateReport = Object.entries(dateWise).map(([date, data]) => ({
          date,
          ...data,
          wastage: data.prod - data.slit // Daily specific wastage
      })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return {
          totalProd,
          totalSlit,
          totalWastage: totalProd - totalSlit,
          topJob,
          topProdSize,
          topSlitSize,
          dateReport
      };

  }, [jobs]);

  const renderStatusBadge = (status: JobStatus | undefined, type: 'production' | 'slitting') => {
      const s = status || 'Pending';
      const isProd = type === 'production';
      
      // Compact Badges
      const prodColors = {
          'Pending': 'bg-slate-100 text-slate-500 border-slate-200',
          'Running': 'bg-emerald-50 text-emerald-600 border-emerald-200',
          'Completed': 'bg-emerald-600 text-white border-emerald-700'
      };
      const slitColors = {
          'Pending': 'bg-slate-100 text-slate-500 border-slate-200',
          'Running': 'bg-blue-50 text-blue-600 border-blue-200',
          'Completed': 'bg-blue-600 text-white border-blue-700'
      };

      const colors = isProd ? prodColors : slitColors;

      return (
        <div className={`flex items-center justify-center px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider min-w-[70px] ${colors[s]}`}>
            {s}
        </div>
      );
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500 print:space-y-4 pb-20">
      
      {/* --- COMPACT METRICS BAR --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 no-print">
         <div className="bg-emerald-50/50 rounded-lg border border-emerald-100 p-3 flex flex-col justify-center relative overflow-hidden">
             <div className="flex items-center gap-2 mb-1">
                 <Activity size={14} className="text-emerald-600"/>
                 <span className="text-[10px] font-bold uppercase text-emerald-700 tracking-wider">Production</span>
             </div>
             <span className="text-2xl font-black text-emerald-700 leading-none">{analytics.totalProd.toFixed(0)} <span className="text-xs font-medium">kg</span></span>
         </div>

         <div className="bg-blue-50/50 rounded-lg border border-blue-100 p-3 flex flex-col justify-center relative overflow-hidden">
             <div className="flex items-center gap-2 mb-1">
                 <Database size={14} className="text-blue-600"/>
                 <span className="text-[10px] font-bold uppercase text-blue-700 tracking-wider">Slitting</span>
             </div>
             <span className="text-2xl font-black text-blue-700 leading-none">{analytics.totalSlit.toFixed(0)} <span className="text-xs font-medium">kg</span></span>
         </div>

         <div className="bg-red-50/50 rounded-lg border border-red-100 p-3 flex flex-col justify-center relative overflow-hidden">
             <div className="flex items-center gap-2 mb-1">
                 <AlertTriangle size={14} className="text-red-600"/>
                 <span className="text-[10px] font-bold uppercase text-red-700 tracking-wider">Wastage</span>
             </div>
             <span className="text-2xl font-black text-red-600 leading-none">{analytics.totalWastage.toFixed(0)} <span className="text-xs font-medium">kg</span></span>
         </div>

         <div className="bg-white rounded-lg border border-slate-200 p-3 flex flex-col justify-center">
             <div className="flex items-center gap-2 mb-1">
                 <Award size={14} className="text-slate-500"/>
                 <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Top Job</span>
             </div>
             <span className="text-lg font-black text-slate-700 leading-none truncate">{analytics.topJob[0]}</span>
         </div>
      </div>

      {/* --- COMPACT CONTROLS --- */}
      <div className="flex gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm no-print">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium focus:ring-1 focus:ring-slate-900 outline-none"
          />
        </div>
        <button
            onClick={handlePrint}
            className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-md font-bold text-xs uppercase tracking-wide transition-colors"
        >
            <Printer size={14} />
            <span className="hidden sm:inline">Report</span>
        </button>
        <button
            onClick={() => setShowForm(true)}
            className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded-md shadow-sm font-bold text-xs uppercase tracking-wide transition-colors"
        >
            <Plus size={14} />
            <span>New Job</span>
        </button>
      </div>

      {/* --- DATEWISE TABLE (Collapsible or Compact) --- */}
      {analytics.dateReport.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm no-print">
             <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center gap-2">
                 <Calendar size={14} className="text-slate-400"/>
                 <h3 className="font-bold text-slate-600 text-xs uppercase tracking-wide">Daily Production Summary</h3>
             </div>
             <div className="max-h-40 overflow-y-auto">
                 <table className="w-full text-xs text-left">
                     <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0 z-10">
                         <tr>
                             <th className="px-3 py-1.5 border-b">Date</th>
                             <th className="px-3 py-1.5 border-b text-emerald-700">Production</th>
                             <th className="px-3 py-1.5 border-b text-blue-700">Slitting</th>
                             <th className="px-3 py-1.5 border-b text-red-700">Wastage</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                         {analytics.dateReport.map((day, idx) => (
                             <tr key={idx} className="hover:bg-slate-50">
                                 <td className="px-3 py-1 font-medium text-slate-700">{day.date}</td>
                                 <td className="px-3 py-1 font-bold text-emerald-600">{day.prod.toFixed(1)}</td>
                                 <td className="px-3 py-1 font-bold text-blue-600">{day.slit.toFixed(1)}</td>
                                 <td className="px-3 py-1 font-bold text-red-600">{day.wastage.toFixed(1)}</td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
        </div>
      )}

      {/* --- COMPACT JOB LIST --- */}
      <div className="grid grid-cols-1 gap-2">
        {filteredJobs.length > 0 ? (
            filteredJobs.map(job => {
                const prodTotal = job.productionData.reduce((acc, curr) => acc + curr.netWeight, 0);
                const slitTotal = job.slittingData.reduce((acc, curr) => acc + curr.netWeight, 0);
                const wastage = prodTotal - slitTotal;

                // Group Slitting Data by Coil Size
                const sizeSummary: Record<string, number> = {};
                job.coils.forEach(c => sizeSummary[c.size] = 0);
                job.slittingData.forEach(d => {
                    const coil = job.coils.find(c => c.id === d.coilId);
                    if(coil) sizeSummary[coil.size] += d.netWeight;
                });

                return (
                <div key={job.id} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden hover:border-slate-400 transition-all break-inside-avoid">
                    {/* Compact Header */}
                    <div className="p-3 flex flex-col sm:flex-row items-center justify-between gap-2 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => toggleExpand(job.id)}>
                        
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                             <div className={`w-1.5 h-8 rounded-full ${job.status === 'Completed' ? 'bg-slate-800' : 'bg-slate-300'}`}></div>
                             <div>
                                 <div className="flex items-baseline gap-2">
                                    <h3 className="text-base font-black text-slate-800 leading-none">#{job.srNo}</h3>
                                    <span className="text-xs font-bold text-slate-500">{job.jobCode}</span>
                                 </div>
                                 <p className="text-[10px] text-slate-400 font-medium">{job.date}</p>
                             </div>
                        </div>

                        {/* Status Pills */}
                        <div className="flex gap-2">
                             <div className="flex flex-col gap-1">
                                 <span className="text-[9px] font-bold text-slate-400 uppercase text-center">Prod</span>
                                 {renderStatusBadge(job.productionStatus, 'production')}
                             </div>
                             <div className="flex flex-col gap-1">
                                 <span className="text-[9px] font-bold text-slate-400 uppercase text-center">Slit</span>
                                 {renderStatusBadge(job.slittingStatus, 'slitting')}
                             </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="flex items-center gap-4 text-xs w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                             <div className="text-right">
                                 <span className="block text-[9px] font-bold text-slate-400 uppercase">Size</span>
                                 <span className="font-bold text-slate-700">{job.size}mm</span>
                             </div>
                             <div className="text-right">
                                 <span className="block text-[9px] font-bold text-slate-400 uppercase">Micron</span>
                                 <span className="font-bold text-slate-700">{job.micron}µ</span>
                             </div>
                             <div className="text-right">
                                 <span className="block text-[9px] font-bold text-slate-400 uppercase">Target</span>
                                 <span className="font-bold text-slate-700">{job.totalQuantity}kg</span>
                             </div>
                             
                             <div className="flex gap-1 no-print ml-2">
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteJob(job.id); }} className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded">
                                    <Trash2 size={14} />
                                </button>
                                <div className="text-slate-300 p-1.5">
                                    {expandedJob === job.id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Expanded Details */}
                    {(expandedJob === job.id || window.matchMedia('print').matches) && (
                        <div className="border-t border-slate-200 bg-slate-50/30 p-3 text-sm animate-in slide-in-from-top-1">
                            
                            {/* Full Job Specs Bar */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 bg-white p-2 rounded border border-slate-200 shadow-sm">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Job Code</span>
                                    <span className="font-bold text-slate-800">{job.jobCode}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Size / Micron</span>
                                    <span className="font-bold text-slate-800">{job.size}mm / {job.micron}µ</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Target Qty</span>
                                    <span className="font-bold text-slate-800">{job.totalQuantity} kg</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Created Date</span>
                                    <span className="font-bold text-slate-800">{job.date}</span>
                                </div>
                            </div>

                            {/* Summary Stats Row */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                                 {/* Prod Total */}
                                 <div className="bg-emerald-50 border border-emerald-200 p-2 rounded flex justify-between items-center">
                                     <span className="text-[10px] font-bold text-emerald-600 uppercase">Total Production</span>
                                     <span className="text-sm font-black text-emerald-800">{prodTotal.toFixed(3)} kg</span>
                                 </div>
                                 {/* Slit Total */}
                                 <div className="bg-blue-50 border border-blue-200 p-2 rounded flex justify-between items-center">
                                     <span className="text-[10px] font-bold text-blue-600 uppercase">Total Slitting</span>
                                     <span className="text-sm font-black text-blue-800">{slitTotal.toFixed(3)} kg</span>
                                 </div>
                                 {/* Wastage */}
                                 <div className={`p-2 rounded flex justify-between items-center border ${wastage > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                                     <span className={`text-[10px] font-bold uppercase ${wastage > 0 ? 'text-red-600' : 'text-slate-500'}`}>Wastage</span>
                                     <span className={`text-sm font-black ${wastage > 0 ? 'text-red-700' : 'text-slate-700'}`}>{wastage.toFixed(3)} kg</span>
                                 </div>
                                 {/* Status Check */}
                                 <div className="p-2 bg-white border border-slate-200 rounded flex items-center justify-between">
                                     <span className="text-[10px] font-bold text-slate-500 uppercase">System Status</span>
                                     <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded">{job.productionStatus === 'Completed' && job.slittingStatus === 'Completed' ? 'FULL COMPLETE' : 'IN PROGRESS'}</span>
                                 </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                {/* Production Log Table */}
                                <div className="bg-white border border-slate-200 rounded overflow-hidden">
                                    <div className="bg-emerald-50 px-3 py-1.5 border-b border-emerald-100 flex justify-between items-center">
                                        <h4 className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1">
                                            <Activity size={12}/> Production Log
                                        </h4>
                                        <span className="text-[10px] font-bold text-emerald-600">Count: {job.productionData.length}</span>
                                    </div>
                                    <div className="overflow-x-auto max-h-60">
                                        <table className="w-full text-[11px] text-left">
                                            <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0 shadow-sm">
                                                <tr>
                                                    <th className="px-2 py-1.5 border-b">Time</th>
                                                    <th className="px-2 py-1.5 border-b text-center">Size (mm)</th>
                                                    <th className="px-2 py-1.5 border-b text-right text-emerald-700">Net Wt (kg)</th>
                                                    <th className="px-2 py-1.5 border-b text-right">Meter</th>
                                                    <th className="px-2 py-1.5 border-b text-center">Joints</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 text-slate-600">
                                                {job.productionData.length === 0 ? (
                                                    <tr><td colSpan={5} className="text-center py-4 italic text-slate-400">No production data</td></tr>
                                                ) : (
                                                    job.productionData.map(d => (
                                                        <tr key={d.id} className="hover:bg-emerald-50/30">
                                                            <td className="px-2 py-1 font-mono text-[10px]">{d.timestamp.split(',')[1]}</td>
                                                            <td className="px-2 py-1 text-center font-bold text-slate-700">{job.size}</td>
                                                            <td className="px-2 py-1 text-right font-bold text-emerald-700">{d.netWeight.toFixed(3)}</td>
                                                            <td className="px-2 py-1 text-right">{d.meter}</td>
                                                            <td className="px-2 py-1 text-center">{d.joints}</td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Slitting Log Table & Breakdown */}
                                <div className="flex flex-col gap-2">
                                    {/* Size Summary Breakdown */}
                                    <div className="bg-blue-50/30 border border-blue-100 rounded p-2">
                                        <h5 className="text-[10px] font-bold text-blue-400 uppercase mb-1">Output by Coil Size</h5>
                                        <div className="flex gap-2 flex-wrap">
                                            {Object.entries(sizeSummary).map(([size, weight]) => (
                                                <div key={size} className="bg-white border border-blue-100 px-2 py-1 rounded flex items-center gap-2 shadow-sm">
                                                    <span className="text-xs font-bold text-slate-700">{size}mm</span>
                                                    <span className="text-xs font-mono font-medium text-blue-600">{weight.toFixed(3)}kg</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-white border border-slate-200 rounded overflow-hidden flex-1">
                                        <div className="bg-blue-50 px-3 py-1.5 border-b border-blue-100 flex justify-between items-center">
                                            <h4 className="text-[11px] font-bold text-blue-800 uppercase tracking-wide flex items-center gap-1">
                                                <Database size={12}/> Slitting Log
                                            </h4>
                                            <span className="text-[10px] font-bold text-blue-600">Count: {job.slittingData.length}</span>
                                        </div>
                                        <div className="overflow-x-auto max-h-48">
                                            <table className="w-full text-[11px] text-left">
                                                <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0 shadow-sm">
                                                    <tr>
                                                        <th className="px-2 py-1.5 border-b">Sr No</th>
                                                        <th className="px-2 py-1.5 border-b text-center">Size (mm)</th>
                                                        <th className="px-2 py-1.5 border-b text-right text-blue-700">Net Wt (kg)</th>
                                                        <th className="px-2 py-1.5 border-b text-right">Meter</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 text-slate-600">
                                                    {job.slittingData.length === 0 ? (
                                                        <tr><td colSpan={4} className="text-center py-4 italic text-slate-400">No slitting data</td></tr>
                                                    ) : (
                                                        job.slittingData.map(d => {
                                                            const coil = job.coils.find(c => c.id === d.coilId);
                                                            return (
                                                            <tr key={d.id} className="hover:bg-blue-50/30">
                                                                <td className="px-2 py-1 font-mono font-bold text-slate-700">{d.srNo}</td>
                                                                <td className="px-2 py-1 text-center font-bold text-slate-700">{coil ? coil.size : '-'}</td>
                                                                <td className="px-2 py-1 text-right font-bold text-blue-700">{d.netWeight.toFixed(3)}</td>
                                                                <td className="px-2 py-1 text-right">{d.meter.toFixed(0)}</td>
                                                            </tr>
                                                        )})
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {job.note && (
                                <div className="mt-2 text-[10px] text-slate-500 italic bg-slate-50 p-1.5 rounded border border-slate-100">
                                    <span className="font-bold not-italic text-slate-700">Note:</span> {job.note}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )})
        ) : (
            <div className="text-center py-12">
                <p className="text-slate-400 text-sm font-medium">No jobs found. Create one to get started.</p>
            </div>
        )}
      </div>

      <button onClick={handleSystemReset} className="fixed bottom-2 right-2 opacity-0 hover:opacity-100 bg-red-600 text-white p-1 rounded text-[10px] z-50">
          Reset
      </button>

      {showForm && <JobCardForm onClose={() => setShowForm(false)} onSubmit={handleCreateJob} />}
    </div>
  );
};

export default AdminDashboard;
