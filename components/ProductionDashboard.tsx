
import React, { useState, useEffect, useRef } from 'react';
import { JobCard, ProductionEntry } from '../types';
import { Search, PlayCircle, CheckCircle, Clock, Trash2, Edit2, Box, RotateCw, Activity, ArrowLeft, ChevronDown, PlusCircle, Save } from 'lucide-react';

interface ProductionDashboardProps {
  jobs: JobCard[];
  onUpdateJob: (job: JobCard) => void;
}

const ProductionDashboard: React.FC<ProductionDashboardProps> = ({ jobs, onUpdateJob }) => {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  const [showMobileForm, setShowMobileForm] = useState(false);
  
  // Form State
  const [entryForm, setEntryForm] = useState({
    grossWeight: '',
    coreWeight: '',
    meter: '',
    joints: '',
  });

  const grossInputRef = useRef<HTMLInputElement>(null);

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  // Reset form when job changes
  useEffect(() => {
    resetForm();
    setEditingEntryId(null);
    setShowMobileForm(false);
  }, [selectedJobId]);

  const resetForm = () => {
    setEntryForm({ grossWeight: '', coreWeight: '', meter: '', joints: '' });
  };

  const handleJobSelect = (id: string) => {
      setSelectedJobId(id);
      setMobileView('detail');
  }

  const handleStatusChange = (jobId: string, status: JobCard['status']) => {
    const jobToUpdate = jobs.find(j => j.id === jobId);
    if (jobToUpdate) {
        onUpdateJob({ ...jobToUpdate, status });
    }
  };

  const handleEditEntry = (entry: ProductionEntry) => {
      setEntryForm({
          grossWeight: String(entry.grossWeight),
          coreWeight: String(entry.coreWeight),
          meter: String(entry.meter || ''),
          joints: String(entry.joints),
      });
      setEditingEntryId(entry.id);
      // If on mobile, open the slider form
      if (window.innerWidth < 768) {
        setShowMobileForm(true);
      }
      // If desktop, focus moves to the input row automatically due to conditional rendering
      setTimeout(() => grossInputRef.current?.focus(), 100);
  };

  const handleAddOrUpdateEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    const gross = Number(entryForm.grossWeight);
    const core = Number(entryForm.coreWeight);
    const meter = Number(entryForm.meter);
    const net = gross - core;

    let updatedJob = { ...selectedJob };

    if (editingEntryId) {
        // Update existing
        updatedJob.productionData = selectedJob.productionData.map(entry => 
            entry.id === editingEntryId 
            ? { ...entry, grossWeight: gross, coreWeight: core, netWeight: net, meter: meter, joints: Number(entryForm.joints) }
            : entry
        );
          setEditingEntryId(null);
    } else {
        // Create new
        const newEntry: ProductionEntry = {
            id: crypto.randomUUID(),
            grossWeight: gross,
            coreWeight: core,
            netWeight: net,
            meter: meter,
            joints: Number(entryForm.joints),
            timestamp: new Date().toLocaleString(),
          };
        updatedJob.productionData = [newEntry, ...selectedJob.productionData];
    }
    
    onUpdateJob(updatedJob);
    resetForm();
    // Keep focus on gross input for rapid entry on desktop
    setTimeout(() => grossInputRef.current?.focus(), 100);
  };

  const handleDeleteEntry = (entryId: string) => {
    if (!selectedJob) return;
    if(!confirm("Delete this entry?")) return;
    
    const updatedJob = { ...selectedJob };
    updatedJob.productionData = selectedJob.productionData.filter(e => e.id !== entryId);
    onUpdateJob(updatedJob);
  }

  // Helper to calculate net on the fly for display in input
  const currentNet = (Number(entryForm.grossWeight) || 0) - (Number(entryForm.coreWeight) || 0);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100dvh-5rem)] relative">
      {/* Job List Sidebar - Hidden on mobile if detail view is active */}
      <div className={`w-full lg:w-1/3 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-full lg:flex ${mobileView === 'detail' ? 'hidden' : 'flex'}`}>
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-bold text-slate-800 mb-3">Production Jobs</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Filter by Sr No..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/30">
          {jobs.map(job => (
            <div
              key={job.id}
              onClick={() => handleJobSelect(job.id)}
              className={`p-4 rounded-xl cursor-pointer border transition-all relative group ${
                selectedJobId === job.id
                  ? 'bg-white border-indigo-500 shadow-md ring-1 ring-indigo-500'
                  : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'
              }`}
            >
               <div className={`absolute right-3 top-3 w-2 h-2 rounded-full ${
                   job.status === 'Running' ? 'bg-amber-500 animate-pulse' : 
                   job.status === 'Completed' ? 'bg-emerald-500' : 'bg-slate-300'
               }`}></div>
              
              <div className="flex flex-col">
                <div className="flex items-baseline justify-between mb-1">
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Job Card</span>
                </div>
                <p className="font-bold text-slate-800 text-lg">#{job.srNo}</p>
                <p className="text-sm text-slate-600 mb-2">{job.jobCode}</p>
                
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 text-xs">
                  <span className="px-2 py-1 bg-slate-100 rounded text-slate-600 font-medium">{job.size}mm</span>
                  <span className="px-2 py-1 bg-slate-100 rounded text-slate-600 font-medium">{job.micron}µ</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Detail Area - Full screen on mobile when active */}
      <div className={`w-full lg:w-2/3 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden relative lg:flex ${mobileView === 'list' ? 'hidden' : 'flex'}`}>
        {selectedJob ? (
          <>
            {/* Mobile Back Button */}
            <div className="lg:hidden p-3 border-b border-slate-100 flex items-center gap-2 text-slate-500 bg-slate-50" onClick={() => setMobileView('list')}>
                <ArrowLeft size={20} />
                <span className="font-medium">Back to Job List</span>
            </div>

            {/* Job Header Card */}
            <div className="p-4 md:p-6 border-b border-slate-100 bg-indigo-50/20 shrink-0">
              <div className="flex flex-col md:flex-row justify-between items-start mb-4 md:mb-6 gap-3">
                  <div className="w-full md:w-auto">
                     <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-2">
                        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">#{selectedJob.srNo}</h2>
                        <div className={`w-fit px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 ${
                             selectedJob.status === 'Running' ? 'bg-amber-100 text-amber-700' : 
                             selectedJob.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 
                             'bg-slate-100 text-slate-600'
                        }`}>
                            {selectedJob.status === 'Running' && <Activity size={12} />}
                            {selectedJob.status === 'Completed' && <CheckCircle size={12} />}
                            {selectedJob.status}
                        </div>
                     </div>
                     <p className="text-2xl md:text-3xl font-bold text-indigo-700">{selectedJob.jobCode}</p>
                  </div>

                  <div className="flex bg-slate-100 p-1 rounded-lg w-full md:w-auto justify-between md:justify-start">
                    {(['Pending', 'Running', 'Completed'] as const).map((s) => (
                        <button
                            key={s}
                            onClick={() => handleStatusChange(selectedJob.id, s)}
                            className={`flex-1 md:flex-none px-3 py-2 md:py-1.5 text-xs font-bold rounded-md transition-all ${
                                selectedJob.status === s
                                ? 'bg-white text-indigo-600 shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            {s}
                        </button>
                    ))}
                  </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mt-2 md:mt-4">
                   <div className="bg-white border border-slate-100 p-2 md:p-3 rounded-xl shadow-sm">
                       <span className="text-[10px] md:text-xs text-slate-400 font-bold uppercase block mb-1">Size</span>
                       <span className="text-xl md:text-3xl font-black text-slate-800">{selectedJob.size} <span className="text-xs md:text-sm font-medium text-slate-400">mm</span></span>
                   </div>
                   <div className="bg-white border border-slate-100 p-2 md:p-3 rounded-xl shadow-sm">
                       <span className="text-[10px] md:text-xs text-slate-400 font-bold uppercase block mb-1">Micron</span>
                       <span className="text-xl md:text-3xl font-black text-slate-800">{selectedJob.micron} <span className="text-xs md:text-sm font-medium text-slate-400">µ</span></span>
                   </div>
                   <div className="bg-white border border-slate-100 p-2 md:p-3 rounded-xl shadow-sm">
                       <span className="text-[10px] md:text-xs text-slate-400 font-bold uppercase block mb-1">Target Qty</span>
                       <span className="text-xl md:text-3xl font-black text-slate-800">{selectedJob.totalQuantity.toFixed(0)} <span className="text-xs md:text-sm font-medium text-slate-400">kg</span></span>
                   </div>
                   <div className="bg-white border border-slate-100 p-2 md:p-3 rounded-xl shadow-sm">
                       <span className="text-[10px] md:text-xs text-slate-400 font-bold uppercase block mb-1">Produced</span>
                       <span className="text-xl md:text-3xl font-black text-indigo-600">{selectedJob.productionData.reduce((a,c) => a + c.netWeight, 0).toFixed(0)} <span className="text-xs md:text-sm font-medium text-indigo-400">kg</span></span>
                   </div>
              </div>
            </div>

            {/* Mobile Slider / Toggle for Data Entry */}
            <div className="md:hidden shrink-0 border-b border-slate-200">
                <button 
                    onClick={() => setShowMobileForm(!showMobileForm)}
                    className={`w-full flex items-center justify-between p-4 font-bold transition-colors ${showMobileForm ? 'bg-indigo-50 text-indigo-700' : 'bg-white text-slate-700'}`}
                >
                    <div className="flex items-center gap-2">
                        {showMobileForm ? <ChevronDown size={20}/> : <PlusCircle size={20} className="text-indigo-600"/>}
                        <span>{showMobileForm ? 'Hide Data Entry' : 'Add Production Data'}</span>
                    </div>
                    {!showMobileForm && (
                        <span className="text-xs font-normal text-slate-400">Tap to open</span>
                    )}
                </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col relative">
                {/* Mobile Input Form */}
                <div className={`
                    bg-slate-50 border-b border-slate-100 shrink-0 transition-all duration-300 ease-in-out overflow-hidden md:hidden
                    ${showMobileForm ? 'max-h-[600px] opacity-100 py-4 px-4' : 'max-h-0 opacity-0'}
                `}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            {editingEntryId ? <RotateCw size={16} className="text-indigo-600"/> : <Box size={16} className="text-indigo-600"/>}
                            {editingEntryId ? 'Update Entry' : 'New Roll Entry'}
                        </h3>
                        {editingEntryId && (
                            <button onClick={() => {setEditingEntryId(null); resetForm();}} className="text-xs text-red-500 hover:underline">Cancel Edit</button>
                        )}
                    </div>
                    
                    <form onSubmit={handleAddOrUpdateEntry} className="grid grid-cols-1 gap-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Gross (kg)</label>
                                <input 
                                    type="number" step="0.001" required
                                    placeholder="0.000"
                                    value={entryForm.grossWeight}
                                    onChange={e => setEntryForm({...entryForm, grossWeight: e.target.value})}
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-lg font-bold text-slate-800 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Core (kg)</label>
                                <input 
                                    type="number" step="0.001" required
                                    placeholder="0.000"
                                    value={entryForm.coreWeight}
                                    onChange={e => setEntryForm({...entryForm, coreWeight: e.target.value})}
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-lg font-bold text-slate-800 transition-all"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Meter</label>
                                <input 
                                    type="number" required
                                    placeholder="0"
                                    value={entryForm.meter}
                                    onChange={e => setEntryForm({...entryForm, meter: e.target.value})}
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-lg font-bold text-slate-800 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Joints</label>
                                <input 
                                    type="number" required
                                    placeholder="0"
                                    value={entryForm.joints}
                                    onChange={e => setEntryForm({...entryForm, joints: e.target.value})}
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-lg font-bold text-slate-800 transition-all"
                                />
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-xl text-base font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5">
                           {editingEntryId ? 'Update Entry' : 'Add Production Data'}
                        </button>
                    </form>
                </div>

                {/* Table Area - Excel Style on Desktop */}
                <div className="flex-1 overflow-y-auto pb-20 md:pb-0 bg-white">
                    {/* Desktop Excel-like Table */}
                    <form onSubmit={handleAddOrUpdateEntry} className="hidden md:block">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-4 py-3 font-bold border-b border-slate-200 w-24">Action</th>
                                    <th className="px-4 py-3 font-bold border-b border-slate-200">Time</th>
                                    <th className="px-4 py-3 font-bold border-b border-slate-200">Gross Wt</th>
                                    <th className="px-4 py-3 font-bold border-b border-slate-200">Core Wt</th>
                                    <th className="px-4 py-3 font-bold border-b border-slate-200 bg-indigo-50/50 text-indigo-700">Net Wt</th>
                                    <th className="px-4 py-3 font-bold border-b border-slate-200">Meter</th>
                                    <th className="px-4 py-3 font-bold border-b border-slate-200">Joints</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {/* Input Row (Excel Style) */}
                                <tr className={`bg-indigo-50/30 border-b-2 border-indigo-100 transition-colors ${editingEntryId ? 'bg-amber-50/50' : ''}`}>
                                    <td className="px-2 py-2">
                                        <button 
                                            type="submit"
                                            className="w-full flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded shadow-sm transition-all text-xs font-bold"
                                        >
                                            {editingEntryId ? <Save size={14} /> : <PlusCircle size={14} />}
                                            {editingEntryId ? 'Save' : 'Add'}
                                        </button>
                                        {editingEntryId && (
                                            <button 
                                                type="button"
                                                onClick={() => {setEditingEntryId(null); resetForm();}}
                                                className="w-full mt-1 text-[10px] text-red-500 hover:text-red-700 text-center"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-xs text-slate-400 italic">
                                        {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </td>
                                    <td className="p-1">
                                        <input 
                                            ref={grossInputRef}
                                            type="number" step="0.001" required
                                            placeholder="Gross"
                                            value={entryForm.grossWeight}
                                            onChange={e => setEntryForm({...entryForm, grossWeight: e.target.value})}
                                            className="w-full p-2 border border-slate-300 rounded focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none font-mono font-semibold text-slate-800 bg-white"
                                        />
                                    </td>
                                    <td className="p-1">
                                        <input 
                                            type="number" step="0.001" required
                                            placeholder="Core"
                                            value={entryForm.coreWeight}
                                            onChange={e => setEntryForm({...entryForm, coreWeight: e.target.value})}
                                            className="w-full p-2 border border-slate-300 rounded focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none font-mono font-semibold text-slate-800 bg-white"
                                        />
                                    </td>
                                    <td className="px-4 py-2">
                                        <div className="font-mono font-bold text-indigo-600 bg-indigo-100/50 px-2 py-1 rounded border border-indigo-100 text-center">
                                            {currentNet > 0 ? currentNet.toFixed(3) : '0.000'}
                                        </div>
                                    </td>
                                    <td className="p-1">
                                        <input 
                                            type="number" required
                                            placeholder="Meter"
                                            value={entryForm.meter}
                                            onChange={e => setEntryForm({...entryForm, meter: e.target.value})}
                                            className="w-full p-2 border border-slate-300 rounded focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none font-mono font-semibold text-slate-800 bg-white"
                                        />
                                    </td>
                                    <td className="p-1">
                                        <input 
                                            type="number" required
                                            placeholder="Jt"
                                            value={entryForm.joints}
                                            onChange={e => setEntryForm({...entryForm, joints: e.target.value})}
                                            className="w-full p-2 border border-slate-300 rounded focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none font-mono font-semibold text-slate-800 bg-white"
                                        />
                                    </td>
                                </tr>

                                {/* Existing Data Rows */}
                                {selectedJob.productionData.map((entry) => (
                                    <tr key={entry.id} className={`hover:bg-slate-50 group ${editingEntryId === entry.id ? 'opacity-50 pointer-events-none bg-slate-100' : ''}`}>
                                        <td className="px-2 py-2 flex gap-1 justify-center">
                                            <button 
                                                type="button"
                                                onClick={() => handleEditEntry(entry)}
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
                                                title="Edit Row"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => handleDeleteEntry(entry.id)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                                title="Delete Row"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 text-xs">{entry.timestamp}</td>
                                        <td className="px-4 py-3 font-mono text-slate-700">{entry.grossWeight.toFixed(3)}</td>
                                        <td className="px-4 py-3 font-mono text-slate-500">{entry.coreWeight.toFixed(3)}</td>
                                        <td className="px-4 py-3 font-mono font-bold text-indigo-600 bg-indigo-50/10">{entry.netWeight.toFixed(3)}</td>
                                        <td className="px-4 py-3 font-mono text-slate-700">{entry.meter || '-'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${entry.joints > 0 ? 'bg-red-50 text-red-600 border border-red-100' : 'text-slate-400'}`}>
                                                {entry.joints}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </form>

                    {/* Mobile Card View */}
                    <div className="md:hidden p-4 space-y-3">
                        {selectedJob.productionData.map((entry) => (
                            <div key={entry.id} className={`bg-white border rounded-lg p-4 shadow-sm ${editingEntryId === entry.id ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50' : 'border-slate-200'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs text-slate-400">{entry.timestamp}</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEditEntry(entry)} className="text-indigo-600 p-1 bg-indigo-50 rounded"><Edit2 size={16} /></button>
                                        <button onClick={() => handleDeleteEntry(entry.id)} className="text-red-600 p-1 bg-red-50 rounded"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="text-xs text-slate-400 block uppercase font-bold">Gross</span>
                                        <span className="font-medium text-lg">{entry.grossWeight.toFixed(3)}</span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-slate-400 block uppercase font-bold">Core</span>
                                        <span className="font-medium text-lg">{entry.coreWeight.toFixed(3)}</span>
                                    </div>
                                    <div className="col-span-2 grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 mt-1">
                                        <div>
                                            <span className="text-xs text-slate-400 block uppercase font-bold">Net</span>
                                            <span className="font-bold text-indigo-600 text-xl">{entry.netWeight.toFixed(3)}</span>
                                        </div>
                                         <div>
                                            <span className="text-xs text-slate-400 block uppercase font-bold">Meter</span>
                                            <span className="font-medium text-slate-700 text-lg">{entry.meter || '-'}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-400 block uppercase font-bold">Joints</span>
                                            <span className={`text-lg ${entry.joints > 0 ? 'text-red-500 font-bold' : 'text-slate-500'}`}>{entry.joints}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {selectedJob.productionData.length === 0 && (
                        <div className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center justify-center text-slate-300">
                                <Box size={48} className="mb-3 opacity-50"/>
                                <p className="text-sm">No production entries recorded yet.</p>
                                <button onClick={() => setShowMobileForm(true)} className="md:hidden mt-4 text-indigo-600 font-bold text-sm">Tap here to add data</button>
                            </div>
                        </div>
                    )}
                </div>
                
                 {selectedJob.productionData.length > 0 && (
                    <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-col sm:flex-row justify-between items-center text-sm shrink-0 safe-area-pb">
                         <span className="text-slate-500 font-medium mb-2 sm:mb-0">Total Entries: {selectedJob.productionData.length}</span>
                         <div className="flex gap-6 w-full sm:w-auto justify-center sm:justify-end">
                             <div className="text-center sm:text-right">
                                 <span className="text-slate-400 text-xs uppercase font-bold mr-2">Total Net Wt:</span>
                                 <span className="text-indigo-700 font-bold text-xl">{selectedJob.productionData.reduce((acc, curr) => acc + curr.netWeight, 0).toFixed(3)} kg</span>
                             </div>
                         </div>
                    </div>
                )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 bg-slate-50/50">
            <div className="text-center max-w-xs px-6">
                <div className="bg-white p-4 rounded-full inline-block shadow-sm mb-4">
                     <PlayCircle size={48} className="text-indigo-200" />
                </div>
                <h3 className="text-slate-700 font-bold mb-2">No Job Selected</h3>
                <p className="text-sm text-slate-500">Select a job from the sidebar to view details and manage production data.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductionDashboard;
