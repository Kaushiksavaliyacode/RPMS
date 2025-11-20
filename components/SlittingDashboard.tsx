
import React, { useState, useEffect, useRef } from 'react';
import { JobCard, SlittingEntry } from '../types';
import { Search, Scissors, Trash2, Calculator, Layers, ArrowRight, ArrowLeft, ChevronDown, PlusCircle } from 'lucide-react';

interface SlittingDashboardProps {
  jobs: JobCard[];
  onUpdateJob: (job: JobCard) => void;
}

const SlittingDashboard: React.FC<SlittingDashboardProps> = ({ jobs, onUpdateJob }) => {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedCoilId, setSelectedCoilId] = useState<string>(''); 
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  const [showMobileForm, setShowMobileForm] = useState(false);
  const [formData, setFormData] = useState({
    srNo: '',
    grossWeight: '',
    coreWeight: '',
  });

  const srNoInputRef = useRef<HTMLInputElement>(null);

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  // Initialize coil selection when job changes
  React.useEffect(() => {
    if (selectedJob && selectedJob.coils.length > 0) {
      setSelectedCoilId(selectedJob.coils[0].id);
    }
    setFormData({ srNo: '', grossWeight: '', coreWeight: '' });
    setShowMobileForm(false);
  }, [selectedJobId, selectedJob]);

  const handleJobSelect = (id: string) => {
      setSelectedJobId(id);
      setMobileView('detail');
  }

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    const coilDef = selectedJob.coils.find(c => c.id === selectedCoilId);
    if (!coilDef) return;

    const gross = Number(formData.grossWeight);
    const core = Number(formData.coreWeight);
    const net = gross - core;
    
    // Formula: Net Weight / Micron / 0.0139 / Size * 1000
    let meter = 0;
    if (selectedJob.micron > 0 && coilDef.size > 0) {
        meter = (net / selectedJob.micron / 0.0139 / coilDef.size) * 1000;
    }

    const newEntry: SlittingEntry = {
      id: crypto.randomUUID(),
      coilId: selectedCoilId,
      srNo: formData.srNo,
      grossWeight: gross,
      coreWeight: core,
      netWeight: net,
      meter: meter,
      timestamp: new Date().toLocaleString(),
    };

    const updatedJob = { ...selectedJob };
    updatedJob.slittingData = [newEntry, ...selectedJob.slittingData];

    onUpdateJob(updatedJob);
    
    // Auto increment Sr No logic if numeric
    const nextSr = isNaN(Number(formData.srNo)) ? '' : String(Number(formData.srNo) + 1);
    setFormData({ 
        srNo: nextSr, 
        grossWeight: '', 
        coreWeight: '' 
    });
    
    // Refocus on Sr No for rapid entry on desktop
    setTimeout(() => srNoInputRef.current?.focus(), 100);
  };

  const handleDeleteEntry = (entryId: string) => {
      if(!selectedJob) return;
      if(!confirm("Delete this entry?")) return;
      
      const updatedJob = { ...selectedJob };
      updatedJob.slittingData = selectedJob.slittingData.filter(e => e.id !== entryId);
      onUpdateJob(updatedJob);
  }

  // Filter data for current view
  const currentCoilData = selectedJob?.slittingData.filter(d => d.coilId === selectedCoilId) || [];
  const allCoilData = selectedJob?.slittingData || [];

  // Real-time calculation for Input Row
  const calculatePreview = () => {
    if (!selectedJob || !selectedCoilId) return { net: 0, meter: 0 };
    const coilDef = selectedJob.coils.find(c => c.id === selectedCoilId);
    const gross = Number(formData.grossWeight) || 0;
    const core = Number(formData.coreWeight) || 0;
    const net = gross - core;
    let meter = 0;
    if (selectedJob.micron > 0 && coilDef && coilDef.size > 0) {
         meter = (net / selectedJob.micron / 0.0139 / coilDef.size) * 1000;
    }
    return { net, meter };
  }

  const preview = calculatePreview();

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100dvh-5rem)]">
       {/* Sidebar */}
       <div className={`w-full lg:w-1/3 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-full lg:flex ${mobileView === 'detail' ? 'hidden' : 'flex'}`}>
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-bold text-slate-800 mb-3">Slitting Jobs</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search Job Code..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {jobs.map(job => (
            <div
              key={job.id}
              onClick={() => handleJobSelect(job.id)}
              className={`p-4 rounded-xl cursor-pointer border transition-all ${
                selectedJobId === job.id
                  ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500 shadow-md'
                  : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-emerald-200'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                   <p className="font-bold text-slate-800">#{job.srNo}</p>
                   <span className="text-[10px] font-bold bg-slate-100 px-2 py-1 rounded text-slate-600">{job.coils.length} Coils</span>
              </div>
              <p className="text-sm text-slate-500 font-medium">{job.jobCode}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                  {job.coils.map(c => (
                      <span key={c.id} className="text-[10px] bg-white border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                          {c.label}: {c.size}mm
                      </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className={`w-full lg:w-2/3 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden lg:flex ${mobileView === 'list' ? 'hidden' : 'flex'}`}>
        {selectedJob ? (
          <>
             {/* Mobile Back Button */}
             <div className="lg:hidden p-3 border-b border-slate-100 flex items-center gap-2 text-slate-500 bg-slate-50" onClick={() => setMobileView('list')}>
                <ArrowLeft size={20} />
                <span className="font-medium">Back to List</span>
            </div>

            <div className="p-4 md:p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-6 gap-4">
                  <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            <Scissors className="text-emerald-600" size={32}/>
                            #{selectedJob.srNo}
                        </h2>
                      </div>
                      <p className="text-2xl md:text-3xl font-bold text-emerald-700 pl-10">{selectedJob.jobCode}</p>
                  </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4">
                 <div className="bg-white border border-slate-200 p-2 md:p-3 rounded-xl shadow-sm">
                     <span className="text-[10px] md:text-xs text-slate-400 font-bold uppercase block mb-1">Micron</span>
                     <span className="text-xl md:text-3xl font-black text-slate-800">{selectedJob.micron} <span className="text-xs md:text-sm font-medium text-slate-400">µ</span></span>
                 </div>
                 <div className="bg-white border border-slate-200 p-2 md:p-3 rounded-xl shadow-sm">
                     <span className="text-[10px] md:text-xs text-slate-400 font-bold uppercase block mb-1">Size</span>
                     <span className="text-xl md:text-3xl font-black text-slate-800">{selectedJob.size} <span className="text-xs md:text-sm font-medium text-slate-400">mm</span></span>
                 </div>
                 <div className="bg-white border border-slate-200 p-2 md:p-3 rounded-xl shadow-sm">
                     <span className="text-[10px] md:text-xs text-slate-400 font-bold uppercase block mb-1">Target Qty</span>
                     <span className="text-xl md:text-3xl font-black text-slate-800">{selectedJob.totalQuantity.toFixed(0)} <span className="text-xs md:text-sm font-medium text-slate-400">kg</span></span>
                 </div>
              </div>

              {/* Coil Tabs - Scrollable on mobile */}
              <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                  {selectedJob.coils.map(coil => (
                      <button
                        key={coil.id}
                        onClick={() => setSelectedCoilId(coil.id)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                            selectedCoilId === coil.id
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 transform scale-105'
                            : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                        }`}
                      >
                          <Layers size={14} />
                          <span>{coil.label}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${selectedCoilId === coil.id ? 'bg-emerald-500/30 text-white' : 'bg-slate-100'}`}>
                              {coil.size}mm
                          </span>
                      </button>
                  ))}
                   <button
                    onClick={() => setSelectedCoilId('ALL')}
                    className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ml-auto ${
                        selectedCoilId === 'ALL'
                        ? 'bg-slate-800 text-white shadow-lg'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                      Summary / All
                  </button>
              </div>
            </div>

             {/* Mobile Slider / Toggle for Data Entry */}
             {selectedCoilId !== 'ALL' && (
                <div className="md:hidden shrink-0 border-b border-slate-200">
                    <button 
                        onClick={() => setShowMobileForm(!showMobileForm)}
                        className={`w-full flex items-center justify-between p-4 font-bold transition-colors ${showMobileForm ? 'bg-emerald-50 text-emerald-700' : 'bg-white text-slate-700'}`}
                    >
                        <div className="flex items-center gap-2">
                            {showMobileForm ? <ChevronDown size={20}/> : <PlusCircle size={20} className="text-emerald-600"/>}
                            <span>{showMobileForm ? 'Hide Data Entry' : 'Add Slitting Data'}</span>
                        </div>
                        {!showMobileForm && (
                            <span className="text-xs font-normal text-slate-400">Tap to open</span>
                        )}
                    </button>
                </div>
            )}

            <div className="flex-1 overflow-hidden flex flex-col relative">
                {/* Mobile Entry Form */}
                {selectedCoilId !== 'ALL' && (
                    <div className={`
                        bg-emerald-50/30 border-b border-emerald-100 shrink-0 transition-all duration-300 ease-in-out overflow-hidden md:hidden
                        ${showMobileForm ? 'max-h-[500px] opacity-100 py-4 px-4' : 'max-h-0 opacity-0'}
                    `}>
                        <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                            <Calculator size={14}/> Data Entry for {selectedJob.coils.find(c => c.id === selectedCoilId)?.label}
                        </h3>
                        <form onSubmit={handleAddEntry} className="grid grid-cols-1 gap-4">
                             <div className="grid grid-cols-2 gap-4">
                                 <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sr No.</label>
                                    <input 
                                        type="text" required
                                        value={formData.srNo}
                                        onChange={e => setFormData({...formData, srNo: e.target.value})}
                                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-lg font-bold text-slate-800"
                                        placeholder="e.g. 1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Gross Wt</label>
                                    <input 
                                        type="number" step="0.001" required
                                        placeholder="0.000"
                                        value={formData.grossWeight}
                                        onChange={e => setFormData({...formData, grossWeight: e.target.value})}
                                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-lg font-bold text-slate-800"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Core Wt</label>
                                    <input 
                                        type="number" step="0.001" required
                                        placeholder="0.000"
                                        value={formData.coreWeight}
                                        onChange={e => setFormData({...formData, coreWeight: e.target.value})}
                                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-lg font-bold text-slate-800"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Calculated Meter</label>
                                    <div className="w-full p-3 border border-emerald-100 bg-emerald-50/50 rounded-xl text-lg font-bold text-emerald-700">
                                        {preview.meter.toFixed(0)} m
                                    </div>
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3.5 rounded-xl text-base font-bold shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5">
                                <span>Save & Calculate</span>
                                <ArrowRight size={16} />
                            </button>
                        </form>
                    </div>
                )}

                {/* Data Table - Excel Style */}
                <div className="flex-1 overflow-y-auto bg-white pb-20 md:pb-0">
                    {/* Desktop Table */}
                    <form onSubmit={handleAddEntry} className="hidden md:block">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 border-b border-slate-200 shadow-sm">
                                <tr>
                                    {selectedCoilId !== 'ALL' && <th className="px-4 py-3 font-bold w-24">Action</th>}
                                    <th className="px-4 py-3 font-bold">Sr. No</th>
                                    {selectedCoilId === 'ALL' && <th className="px-4 py-3 font-bold">Coil</th>}
                                    <th className="px-4 py-3 font-bold">Gross Wt</th>
                                    <th className="px-4 py-3 font-bold">Core Wt</th>
                                    <th className="px-4 py-3 font-bold">Net Wt</th>
                                    <th className="px-4 py-3 font-bold text-emerald-700 bg-emerald-50/30">Meter</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {/* Input Row - Excel Style (Only if a coil is selected) */}
                                {selectedCoilId !== 'ALL' && (
                                    <tr className="bg-emerald-50/20 border-b-2 border-emerald-100">
                                        <td className="px-2 py-2">
                                            <button 
                                                type="submit"
                                                className="w-full flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded shadow-sm transition-all text-xs font-bold"
                                            >
                                                <PlusCircle size={14} /> Add
                                            </button>
                                        </td>
                                        <td className="p-1">
                                            <input 
                                                ref={srNoInputRef}
                                                type="text" required
                                                placeholder="Sr"
                                                value={formData.srNo}
                                                onChange={e => setFormData({...formData, srNo: e.target.value})}
                                                className="w-full p-2 border border-slate-300 rounded focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none font-bold text-slate-800 bg-white"
                                            />
                                        </td>
                                        <td className="p-1">
                                            <input 
                                                type="number" step="0.001" required
                                                placeholder="Gross"
                                                value={formData.grossWeight}
                                                onChange={e => setFormData({...formData, grossWeight: e.target.value})}
                                                className="w-full p-2 border border-slate-300 rounded focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none font-mono font-semibold text-slate-800 bg-white"
                                            />
                                        </td>
                                        <td className="p-1">
                                            <input 
                                                type="number" step="0.001" required
                                                placeholder="Core"
                                                value={formData.coreWeight}
                                                onChange={e => setFormData({...formData, coreWeight: e.target.value})}
                                                className="w-full p-2 border border-slate-300 rounded focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none font-mono font-semibold text-slate-800 bg-white"
                                            />
                                        </td>
                                        <td className="px-4 py-2 font-mono font-bold text-slate-500">
                                            {preview.net > 0 ? preview.net.toFixed(3) : '-'}
                                        </td>
                                        <td className="px-4 py-2 font-mono font-bold text-emerald-600 bg-emerald-100/50 rounded border border-emerald-100">
                                            {preview.meter > 0 ? preview.meter.toFixed(0) : 'Auto'}
                                        </td>
                                    </tr>
                                )}

                                {/* Data Rows */}
                                {(selectedCoilId === 'ALL' ? allCoilData : currentCoilData).map((entry) => (
                                    <tr key={entry.id} className="hover:bg-slate-50 transition-colors group">
                                        {selectedCoilId !== 'ALL' && (
                                            <td className="px-2 py-2">
                                                <button 
                                                    type="button"
                                                    onClick={() => handleDeleteEntry(entry.id)}
                                                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        )}
                                        <td className="px-4 py-3 font-medium text-slate-700">{entry.srNo}</td>
                                        {selectedCoilId === 'ALL' && (
                                            <td className="px-4 py-3">
                                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-medium border border-slate-200">
                                                    {selectedJob.coils.find(c => c.id === entry.coilId)?.label}
                                                </span>
                                            </td>
                                        )}
                                        <td className="px-4 py-3 font-mono text-slate-600">{entry.grossWeight.toFixed(3)}</td>
                                        <td className="px-4 py-3 font-mono text-slate-400">{entry.coreWeight.toFixed(3)}</td>
                                        <td className="px-4 py-3 font-mono font-bold text-slate-800">{entry.netWeight.toFixed(3)}</td>
                                        <td className="px-4 py-3 font-mono font-bold text-emerald-600 bg-emerald-50/30">{entry.meter.toFixed(0)} m</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </form>

                    {/* Mobile Cards */}
                    <div className="md:hidden p-4 space-y-3">
                        {(selectedCoilId === 'ALL' ? allCoilData : currentCoilData).map((entry) => (
                            <div key={entry.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-800 text-lg">#{entry.srNo}</span>
                                        {selectedCoilId === 'ALL' && (
                                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-medium border border-slate-200">
                                                {selectedJob.coils.find(c => c.id === entry.coilId)?.label}
                                            </span>
                                        )}
                                    </div>
                                    {selectedCoilId !== 'ALL' && (
                                        <button onClick={() => handleDeleteEntry(entry.id)} className="text-slate-300 hover:text-red-600 bg-red-50 p-1.5 rounded"><Trash2 size={16}/></button>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-y-2 text-sm">
                                    <div className="flex flex-col">
                                        <span className="text-slate-400 text-xs uppercase font-bold">Gross</span>
                                        <span className="font-medium text-lg">{entry.grossWeight.toFixed(3)}</span>
                                    </div>
                                     <div className="flex flex-col">
                                        <span className="text-slate-400 text-xs uppercase font-bold">Core</span>
                                        <span className="font-medium text-lg">{entry.coreWeight.toFixed(3)}</span>
                                    </div>
                                    <div className="flex flex-col border-t border-slate-100 pt-1 mt-1">
                                        <span className="text-slate-400 text-xs uppercase font-bold">Net</span>
                                        <span className="font-bold text-lg">{entry.netWeight.toFixed(3)}</span>
                                    </div>
                                     <div className="flex flex-col border-t border-slate-100 pt-1 mt-1">
                                        <span className="text-slate-400 text-xs uppercase font-bold">Meter</span>
                                        <span className="font-mono text-emerald-600 font-bold text-lg">{entry.meter.toFixed(0)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {(selectedCoilId === 'ALL' ? allCoilData : currentCoilData).length === 0 && (
                        <div className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center justify-center text-slate-300">
                                <Layers size={40} className="mb-2 opacity-50"/>
                                <p className="text-sm">No records found for this selection.</p>
                                {selectedCoilId !== 'ALL' && (
                                    <button onClick={() => setShowMobileForm(true)} className="md:hidden mt-4 text-emerald-600 font-bold text-sm">Tap here to add data</button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Totals */}
                {(selectedCoilId === 'ALL' ? allCoilData : currentCoilData).length > 0 && (
                    <div className="bg-slate-50 border-t border-slate-200 p-4 shrink-0 safe-area-pb">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center md:text-left">
                             <div>
                                 <p className="text-xs text-slate-500 uppercase font-bold">Total Gross</p>
                                 <p className="text-lg font-semibold text-slate-700">{(selectedCoilId === 'ALL' ? allCoilData : currentCoilData).reduce((a,c) => a + c.grossWeight, 0).toFixed(3)} kg</p>
                             </div>
                             <div>
                                 <p className="text-xs text-slate-500 uppercase font-bold">Total Core</p>
                                 <p className="text-lg font-semibold text-slate-700">{(selectedCoilId === 'ALL' ? allCoilData : currentCoilData).reduce((a,c) => a + c.coreWeight, 0).toFixed(3)} kg</p>
                             </div>
                             <div>
                                 <p className="text-xs text-slate-500 uppercase font-bold">Total Net Weight</p>
                                 <p className="text-lg font-bold text-emerald-700">{(selectedCoilId === 'ALL' ? allCoilData : currentCoilData).reduce((a,c) => a + c.netWeight, 0).toFixed(3)} kg</p>
                             </div>
                             <div>
                                 <p className="text-xs text-slate-500 uppercase font-bold">Total Meters</p>
                                 <p className="text-lg font-bold text-emerald-700 font-mono">{(selectedCoilId === 'ALL' ? allCoilData : currentCoilData).reduce((a,c) => a + c.meter, 0).toFixed(0)} m</p>
                             </div>
                        </div>
                    </div>
                )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 bg-slate-50/50">
              <div className="text-center px-6">
                <div className="bg-white p-4 rounded-full inline-block shadow-sm mb-4">
                    <Scissors size={48} className="text-emerald-200" />
                </div>
                <h3 className="text-slate-700 font-bold mb-2">No Job Selected</h3>
                <p className="text-sm text-slate-500">Select a job card to begin slitting data entry.</p>
              </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SlittingDashboard;
