
import React, { useState, useMemo } from 'react';
import { JobCard, JobStatus } from '../types';
import JobCardForm from './JobCardForm';
import { Plus, Trash2, Search, Database, Activity, BarChart3, Clock, ChevronDown, ChevronUp, Printer, TrendingUp, AlertTriangle, Calendar, Award, Scale } from 'lucide-react';
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
             // Assuming timestamp format "DD/MM/YYYY, HH:MM:SS" or similar standard locale string
             const date = d.timestamp.split(',')[0].trim(); 
             if(!dateWise[date]) dateWise[date] = { prod: 0, slit: 0, count: 0 };
             dateWise[date].slit += d.netWeight;
         });

         // Datewise Production Logic
         job.productionData.forEach(d => {
             const date = d.timestamp.split(',')[0].trim();
             if(!dateWise[date]) dateWise[date] = { prod: 0, slit: 0, count: 0 };
             dateWise[date].prod += d.netWeight;
             dateWise[date].count += 1; // Entries count
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
      
      // Production = Green, Slitting = Blue
      const prodColors = {
          'Pending': 'bg-slate-100 text-slate-500 border-slate-200',
          'Running': 'bg-emerald-50 text-emerald-600 border-emerald-200',
          'Completed': 'bg-emerald-600 text-white border-emerald-700 shadow-sm shadow-emerald-200'
      };
      const slitColors = {
          'Pending': 'bg-slate-100 text-slate-500 border-slate-200',
          'Running': 'bg-blue-50 text-blue-600 border-blue-200',
          'Completed': 'bg-blue-600 text-white border-blue-700 shadow-sm shadow-blue-200'
      };

      const colors = isProd ? prodColors : slitColors;

      return (
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wide transition-all ${colors[s]}`}>
            <span>{type === 'production' ? 'Prod' : 'Slit'}: {s}</span>
        </div>
      );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 print:space-y-4 pb-20">
      
      {/* --- TOP SECTION: KEY METRICS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
         {/* Production Output - GREEN */}
         <div className="bg-gradient-to-br from-emerald-50 to-white p-6 rounded-2xl shadow-sm border border-emerald-100 relative overflow-hidden group">
           <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <Activity size={80} className="text-emerald-600"/>
           </div>
           <div className="flex items-center gap-3 mb-2">
               <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600"><Activity size={20}/></div>
               <p className="text-emerald-800 text-sm font-bold uppercase tracking-wider">Total Production</p>
           </div>
           <h3 className="text-4xl font-black text-emerald-700 tracking-tight">{analytics.totalProd.toFixed(3)} <span className="text-lg font-medium opacity-60">kg</span></h3>
        </div>

         {/* Slitting Output - BLUE */}
         <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-2xl shadow-sm border border-blue-100 relative overflow-hidden group">
           <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <Database size={80} className="text-blue-600"/>
           </div>
           <div className="flex items-center gap-3 mb-2">
               <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Database size={20}/></div>
               <p className="text-blue-800 text-sm font-bold uppercase tracking-wider">Total Slitting</p>
           </div>
           <h3 className="text-4xl font-black text-blue-700 tracking-tight">{analytics.totalSlit.toFixed(3)} <span className="text-lg font-medium opacity-60">kg</span></h3>
        </div>

        {/* Wastage - RED */}
        <div className="bg-gradient-to-br from-red-50 to-white p-6 rounded-2xl shadow-sm border border-red-100 relative overflow-hidden group">
           <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <AlertTriangle size={80} className="text-red-600"/>
           </div>
           <div className="flex items-center gap-3 mb-2">
               <div className="p-2 bg-red-100 rounded-lg text-red-600"><AlertTriangle size={20}/></div>
               <p className="text-red-800 text-sm font-bold uppercase tracking-wider">Total Wastage</p>
           </div>
           <h3 className="text-4xl font-black text-red-600 tracking-tight">{analytics.totalWastage.toFixed(3)} <span className="text-lg font-medium opacity-60">kg</span></h3>
        </div>
      </div>

      {/* --- ANALYTICS DASHBOARD --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="bg-purple-50 p-3 rounded-full text-purple-600">
                  <Award size={24} />
              </div>
              <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Top Job Code</p>
                  <p className="text-lg font-black text-slate-800">{analytics.topJob[0]} <span className="text-xs font-normal text-slate-400">({analytics.topJob[1].toFixed(0)}kg)</span></p>
              </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="bg-emerald-50 p-3 rounded-full text-emerald-600">
                  <Scale size={24} />
              </div>
              <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Best Prod Size</p>
                  <p className="text-lg font-black text-slate-800">{analytics.topProdSize[0]}mm <span className="text-xs font-normal text-slate-400">({analytics.topProdSize[1].toFixed(0)}kg)</span></p>
              </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="bg-blue-50 p-3 rounded-full text-blue-600">
                  <Scale size={24} />
              </div>
              <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Best Slit Size</p>
                  <p className="text-lg font-black text-slate-800">{analytics.topSlitSize[0]}mm <span className="text-xs font-normal text-slate-400">({analytics.topSlitSize[1].toFixed(0)}kg)</span></p>
              </div>
          </div>
      </div>

      {/* --- CONTROLS --- */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm no-print">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search Job Code or Sr No..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm transition-all font-medium"
          />
        </div>
        <div className="flex w-full md:w-auto gap-2">
            <button
            onClick={handlePrint}
            className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-6 py-3 rounded-xl transition-all font-bold text-xs uppercase tracking-wide"
            >
            <Printer size={16} />
            <span className="hidden sm:inline">Print Report</span>
            </button>
            <button
            onClick={() => setShowForm(true)}
            className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl shadow-lg shadow-slate-900/20 transition-all font-bold text-xs uppercase tracking-wide"
            >
            <Plus size={16} />
            <span>Create Job</span>
            </button>
        </div>
      </div>

      {/* --- DATEWISE REPORT TABLE --- */}
      {analytics.dateReport.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm no-print">
             <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                 <Calendar size={18} className="text-slate-500"/>
                 <h3 className="font-bold text-slate-700">Datewise Report</h3>
             </div>
             <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                     <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase border-b border-slate-200">
                         <tr>
                             <th className="px-6 py-3">Date</th>
                             <th className="px-6 py-3 text-emerald-600">Production (kg)</th>
                             <th className="px-6 py-3 text-blue-600">Slitting (kg)</th>
                             <th className="px-6 py-3 text-red-600">Wastage (kg)</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                         {analytics.dateReport.map((day, idx) => (
                             <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                 <td className="px-6 py-3 font-medium text-slate-700">{day.date}</td>
                                 <td className="px-6 py-3 font-bold text-emerald-600">{day.prod.toFixed(3)}</td>
                                 <td className="px-6 py-3 font-bold text-blue-600">{day.slit.toFixed(3)}</td>
                                 <td className="px-6 py-3 font-bold text-red-600">{day.wastage.toFixed(3)}</td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
        </div>
      )}

      {/* --- JOB LISTING --- */}
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
                <div key={job.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:border-slate-300 transition-all duration-300 break-inside-avoid">
                    {/* Card Header */}
                    <div className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => toggleExpand(job.id)}>
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="p-3 rounded-xl bg-slate-100 text-slate-500 border border-slate-200">
                                <Clock size={24} />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-baseline gap-3 flex-wrap">
                                    <h3 className="text-xl font-black text-slate-800 tracking-tight">#{job.srNo}</h3>
                                    <span className="text-sm font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{job.jobCode}</span>
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
                                <div className="bg-white p-5 rounded-xl border border-emerald-100 shadow-sm relative overflow-hidden">
                                    <div className="absolute right-0 top-0 p-2 opacity-5"><Activity size={48} className="text-emerald-600"/></div>
                                    <p className="text-xs text-emerald-600 uppercase font-bold tracking-wide mb-1">Production</p>
                                    <p className="text-2xl font-black text-emerald-700">{prodTotal.toFixed(3)} kg</p>
                                </div>
                                <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm relative overflow-hidden">
                                    <div className="absolute right-0 top-0 p-2 opacity-5"><Database size={48} className="text-blue-600"/></div>
                                    <p className="text-xs text-blue-600 uppercase font-bold tracking-wide mb-1">Slitting</p>
                                    <p className="text-2xl font-black text-blue-700">{slitTotal.toFixed(3)} kg</p>
                                </div>
                                <div className={`bg-white p-5 rounded-xl border shadow-sm relative overflow-hidden ${wastage > 0 ? 'border-red-200 bg-red-50/20' : 'border-slate-200'}`}>
                                    <div className="absolute right-0 top-0 p-2 opacity-5"><AlertTriangle size={48} className="text-red-600"/></div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wide mb-1">Wastage</p>
                                    </div>
                                    <p className={`text-2xl font-black ${wastage > 0 ? 'text-red-600' : 'text-slate-700'}`}>
                                        {wastage.toFixed(3)} kg
                                    </p>
                                </div>
                            </div>

                            {/* Coil Breakdown Section */}
                            <div className="mb-6 bg-white rounded-xl border border-slate-200 p-5">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Coil Breakdown (Slitting)</h4>
                                <div className="flex flex-wrap gap-4">
                                    {coilBreakdown.map(coil => (
                                        <div key={coil.id} className="flex-1 min-w-[180px] bg-blue-50/30 rounded-lg p-4 border border-blue-100">
                                            <div className="flex flex-col mb-3">
                                                <div className="flex items-center gap-2 mb-1">
                                                   <span className="text-2xl font-black text-blue-900">{coil.size}mm</span>
                                                </div>
                                                <span className="text-xs font-bold text-blue-500 uppercase tracking-wide">Target Rolls: {coil.totalRolls || '-'}</span>
                                            </div>
                                            <div className="border-t border-blue-100 pt-2 mt-2">
                                                <p className="text-xs text-slate-400 uppercase tracking-wider">Actual</p>
                                                <p className="text-lg font-bold text-blue-700">{coil.weight.toFixed(3)} <span className="text-xs font-normal text-blue-400">kg</span></p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Live Production Data View */}
                                <div className="bg-white rounded-xl border border-emerald-100 p-5 shadow-sm">
                                    <div className="flex justify-between items-center mb-4 border-b border-emerald-50 pb-3">
                                        <h4 className="font-bold text-emerald-700 flex items-center gap-2">
                                            <Activity size={18}/> Production Logs
                                        </h4>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto pr-2">
                                        <table className="w-full text-xs text-left">
                                            <thead className="text-emerald-600/70 font-medium bg-emerald-50 sticky top-0">
                                                <tr>
                                                    <th className="px-2 py-2 rounded-l">Time</th>
                                                    <th className="px-2 py-2">Net Weight</th>
                                                    <th className="px-2 py-2">Meter</th>
                                                    <th className="px-2 py-2 rounded-r">Joints</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-emerald-50 text-slate-600">
                                                {job.productionData.length === 0 ? (
                                                    <tr><td colSpan={4} className="text-center py-6 text-slate-400 italic">No logs yet</td></tr>
                                                ) : (
                                                    job.productionData.map(d => (
                                                        <tr key={d.id} className="hover:bg-emerald-50/30 transition-colors">
                                                            <td className="px-2 py-2.5">{d.timestamp.split(',')[1]}</td>
                                                            <td className="px-2 py-2.5 font-bold text-emerald-700">{d.netWeight.toFixed(3)}</td>
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
                                <div className="bg-white rounded-xl border border-blue-100 p-5 shadow-sm">
                                    <div className="flex justify-between items-center mb-4 border-b border-blue-50 pb-3">
                                        <h4 className="font-bold text-blue-700 flex items-center gap-2">
                                            <Database size={18}/> Slitting Logs
                                        </h4>
                                    </div>
                                     <div className="max-h-60 overflow-y-auto pr-2">
                                        <table className="w-full text-xs text-left">
                                            <thead className="text-blue-600/70 font-medium bg-blue-50 sticky top-0">
                                                <tr>
                                                    <th className="px-2 py-2 rounded-l">Sr No</th>
                                                    <th className="px-2 py-2">Coil (Size)</th>
                                                    <th className="px-2 py-2">Net Wt</th>
                                                    <th className="px-2 py-2 rounded-r">Meter</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-blue-50 text-slate-600">
                                                {job.slittingData.length === 0 ? (
                                                    <tr><td colSpan={4} className="text-center py-6 text-slate-400 italic">No logs yet</td></tr>
                                                ) : (
                                                    job.slittingData.map(d => {
                                                        const coil = job.coils.find(c => c.id === d.coilId);
                                                        return (
                                                        <tr key={d.id} className="hover:bg-blue-50/30 transition-colors">
                                                            <td className="px-2 py-2.5 font-mono">{d.srNo}</td>
                                                            <td className="px-2 py-2.5 text-slate-500">{coil ? `${coil.size}mm` : '-'}</td>
                                                            <td className="px-2 py-2.5 font-bold text-blue-700">{d.netWeight.toFixed(3)}</td>
                                                            <td className="px-2 py-2.5 font-mono text-slate-500">{d.meter.toFixed(0)}</td>
                                                        </tr>
                                                    )})
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                            
                            {job.note && (
                                <div className="mt-6 p-3 bg-slate-50 text-slate-600 text-xs rounded-lg border border-slate-100 flex items-start gap-2 italic">
                                    <span className="not-italic font-bold text-slate-800">Note:</span> {job.note}
                                </div>
                            )}
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
