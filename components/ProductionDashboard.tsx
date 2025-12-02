
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { JobCard, ProductionEntry, JobStatus } from '../types';
import { Search, Activity, Save, Trash2, ArrowLeft, Plus, CloudLightning, Clock, Play } from 'lucide-react';

interface ProductionDashboardProps {
  jobs: JobCard[];
  onUpdateJob: (job: JobCard) => void;
}

// Helper for empty rows
const generateEmptyRows = (count: number) => {
  return Array(count).fill(null).map(() => ({
    id: crypto.randomUUID(),
    grossWeight: '',
    coreWeight: '',
    meter: '',
    joints: '',
    isNew: true
  }));
};

const ProductionDashboard: React.FC<ProductionDashboardProps> = ({ jobs, onUpdateJob }) => {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  const [isSaving, setIsSaving] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState('');
  
  // Timer State
  const [now, setNow] = useState(Date.now());
  
  // Excel-like Grid State
  const [gridData, setGridData] = useState<any[]>([]);
  
  // Ref to track if we are currently typing (to prevent overwriting local state with db state)
  const isTypingRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  // Timer Tick
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Load data ONLY when job selection changes or if we are not typing
  useEffect(() => {
    if (selectedJob && !isTypingRef.current) {
      const existing = selectedJob.productionData.map(d => ({
        ...d,
        grossWeight: d.grossWeight.toString(),
        coreWeight: d.coreWeight.toString(),
        meter: d.meter ? d.meter.toString() : '',
        joints: d.joints.toString(),
        isNew: false
      }));
      
      // Only append empty rows if there are none, or append 5 if clean load
      const neededRows = Math.max(0, 5 - (existing.length % 5)); 
      // But user logic was "add 5 empty rows at bottom". Let's stick to that logic if list is empty, 
      // otherwise just ensure we have the existing data.
      
      if (gridData.length === 0 || gridData[0]?.id !== existing[0]?.id) {
           setGridData([...existing, ...generateEmptyRows(5)]);
      }
    } else if (!selectedJob) {
      setGridData([]);
    }
  }, [selectedJob?.id, selectedJob?.productionData]); // Only trigger if ID or Data changes

  const handleJobSelect = (id: string) => {
      setSelectedJobId(id);
      setMobileView('detail');
      isTypingRef.current = false;
      setGridData([]); // Clear previous to force reload
  };

  const handleStartJob = () => {
    if (!selectedJob) return;
    onUpdateJob({
        ...selectedJob,
        productionStatus: 'Running',
        productionStartTime: Date.now()
    });
  };

  // --- CORE LOGIC: Convert Grid to DB Format ---
  const getFormattedData = (currentGrid: any[]) => {
    // Filter out completely empty new rows
    const validRows = currentGrid.filter(row => {
        if (!row.isNew) return true; 
        return row.grossWeight !== '' || row.coreWeight !== '' || row.meter !== '';
    });

    return validRows.map(row => {
        const gross = parseFloat(row.grossWeight) || 0;
        const core = parseFloat(row.coreWeight) || 0;
        return {
            id: row.id,
            grossWeight: gross,
            coreWeight: core,
            netWeight: gross - core,
            meter: parseFloat(row.meter) || 0,
            joints: parseFloat(row.joints) || 0,
            timestamp: row.timestamp || new Date().toLocaleString(),
        };
    });
  };

  // --- AUTO SAVE FUNCTION ---
  const triggerAutoSave = useCallback((newData: any[]) => {
      if (!selectedJob) return;

      if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
      }

      setIsSaving(true);

      saveTimeoutRef.current = setTimeout(() => {
          const formatted = getFormattedData(newData);
          
          // Check status logic
          const currentIsComplete = selectedJob.productionStatus === 'Completed';
          const newStatus = currentIsComplete ? 'Completed' : (formatted.length > 0 ? 'Running' : 'Pending');
          
          // If transitioning to Running, set start time if not exists
          const newStartTime = (!selectedJob.productionStartTime && newStatus === 'Running') ? Date.now() : selectedJob.productionStartTime;

          onUpdateJob({
              ...selectedJob,
              productionData: formatted,
              productionStatus: newStatus,
              productionStartTime: newStartTime
          });
          
          setIsSaving(false);
          isTypingRef.current = false; // Release typing lock after save
      }, 1500); // 1.5 second debounce
  }, [selectedJob, onUpdateJob]);

  // Handle Cell Change
  const handleCellChange = (id: string, field: string, value: string) => {
    isTypingRef.current = true;
    
    const newGrid = gridData.map(row => {
      if (row.id === id) {
        return { ...row, [field]: value };
      }
      return row;
    });

    setGridData(newGrid);
    triggerAutoSave(newGrid);
  };

  // Toggle Completion Status
  const toggleCompletion = (currentState: boolean) => {
      if (!selectedJob) return;
      const hasData = selectedJob.productionData.length > 0;
      const newStatus: JobStatus = !currentState ? 'Completed' : (hasData ? 'Running' : 'Pending');
      
      const newEndTime = newStatus === 'Completed' ? Date.now() : undefined;

      onUpdateJob({
          ...selectedJob,
          productionStatus: newStatus,
          productionEndTime: newEndTime
      });
  };

  // Manual Save (Immediate)
  const handleManualSave = () => {
    if (!selectedJob) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    const formatted = getFormattedData(gridData);
    const currentIsComplete = selectedJob.productionStatus === 'Completed';
    const newStatus = currentIsComplete ? 'Completed' : (formatted.length > 0 ? 'Running' : 'Pending');
    const newStartTime = (!selectedJob.productionStartTime && newStatus === 'Running') ? Date.now() : selectedJob.productionStartTime;

    onUpdateJob({ 
        ...selectedJob, 
        productionData: formatted,
        productionStatus: newStatus,
        productionStartTime: newStartTime
    });
    setIsSaving(false);
    isTypingRef.current = false;
    alert(`Data Saved.`);
  };

  const addMoreRows = () => {
      setGridData(prev => [...prev, ...generateEmptyRows(5)]);
  };

  const handleDeleteRow = (id: string) => {
      if(confirm("Delete this row?")) {
        const newGrid = gridData.filter(r => r.id !== id);
        setGridData(newGrid);
        triggerAutoSave(newGrid);
      }
  };
  
  const getElapsedTime = () => {
    if (!selectedJob?.productionStartTime) return "00:00:00";
    
    // If completed, check if we have an end time. If not, just use current time or maybe freeze?
    // For now, if completed and we have endTime, use that. Else use now.
    const end = (selectedJob.productionStatus === 'Completed' && selectedJob.productionEndTime) 
        ? selectedJob.productionEndTime 
        : now;
        
    const start = selectedJob.productionStartTime;
    const diff = Math.max(0, Math.floor((end - start) / 1000));
    const h = Math.floor(diff / 3600).toString().padStart(2, '0');
    const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
    const s = (diff % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const isProdComplete = selectedJob?.productionStatus === 'Completed';
  
  // Filter jobs for sidebar
  const filteredJobs = jobs.filter(j => {
      const term = sidebarSearch.toLowerCase();
      return (
          j.srNo.toLowerCase().includes(term) ||
          j.jobCode.toLowerCase().includes(term) ||
          j.size.toString().includes(term) ||
          j.coils.some(c => c.size.toString().includes(term))
      );
  });

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100dvh-5rem)] relative bg-slate-50 font-sans">
      {/* Job List Sidebar */}
      <div className={`w-full lg:w-80 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden shrink-0 h-full lg:flex ${mobileView === 'detail' ? 'hidden' : 'flex'}`}>
        <div className="p-4 border-b border-slate-100 bg-white sticky top-0 z-10">
          <h2 className="font-bold text-slate-800 mb-3 text-lg">Production Jobs</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search No, Code, Size..."
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-slate-50/50">
          {filteredJobs.length === 0 ? (
              <div className="text-center py-4 text-slate-400 text-xs font-medium">No jobs match your search</div>
          ) : (
            filteredJobs.map(job => (
                <div
                key={job.id}
                onClick={() => handleJobSelect(job.id)}
                className={`p-4 rounded-xl cursor-pointer border transition-all duration-200 ${
                    selectedJobId === job.id
                    ? 'bg-white border-emerald-500 shadow-md ring-1 ring-emerald-500 relative z-10'
                    : 'bg-white border-slate-100 hover:border-emerald-300 hover:shadow-sm'
                }`}
                >
                <div className="flex justify-between items-center mb-2">
                    <span className="font-black text-lg text-slate-800">#{job.srNo}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-extrabold border ${
                        job.productionStatus === 'Running' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                        job.productionStatus === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                    }`}>{job.productionStatus}</span>
                </div>
                <p className="text-xs font-bold text-slate-400 truncate uppercase tracking-wide mb-2">{job.jobCode}</p>
                <div className="flex gap-2">
                    <span className="text-[10px] border border-slate-100 px-2 py-1 rounded bg-slate-50 text-slate-600 font-bold">{job.size}mm</span>
                    <span className="text-[10px] border border-slate-100 px-2 py-1 rounded bg-slate-50 text-slate-600 font-bold">{job.micron}µ</span>
                </div>
                </div>
            ))
          )}
        </div>
      </div>

      {/* Main Grid Area */}
      <div className={`flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden relative ${mobileView === 'list' ? 'hidden' : 'flex'}`}>
        {selectedJob ? (
          <>
            {/* LIGHT STATUS BAR HEADER (Sticky) */}
             <div className="bg-emerald-50/50 border-b border-emerald-100 p-4 sticky top-0 z-30 shadow-sm shrink-0">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                    
                    <div className="flex items-center gap-4 w-full xl:w-auto">
                        <button onClick={() => setMobileView('list')} className="lg:hidden p-2 bg-white hover:bg-slate-50 rounded-full transition-colors text-slate-600 shadow-sm">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <div className="flex items-baseline gap-2">
                                <h1 className="text-2xl font-black tracking-tight text-emerald-950">#{selectedJob.srNo}</h1>
                                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-sm font-bold font-mono border border-emerald-200">{selectedJob.jobCode}</span>
                                {isSaving && <span className="text-[10px] flex items-center gap-1 text-emerald-600 animate-pulse font-bold uppercase"><CloudLightning size={12}/> Saving...</span>}
                            </div>
                        </div>
                    </div>
                    
                    {/* Timer Display */}
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-emerald-100 shadow-sm">
                        <Clock size={16} className={`${selectedJob.productionStatus === 'Running' ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
                        <span className="font-mono font-bold text-lg text-slate-700">
                             {getElapsedTime()}
                        </span>
                    </div>

                    {/* Job Specs Stats */}
                    <div className="flex flex-wrap items-center gap-4 sm:gap-8 w-full xl:w-auto bg-white xl:bg-transparent p-3 xl:p-0 rounded-lg border border-emerald-100 xl:border-0">
                         <div className="flex flex-col">
                             <span className="uppercase text-[10px] font-bold text-emerald-400 tracking-wider">Width</span>
                             <span className="text-emerald-900 font-bold text-sm">{selectedJob.size}<span className="text-xs font-normal text-emerald-600 ml-0.5">mm</span></span>
                         </div>
                         <div className="w-px h-6 bg-emerald-200"></div>
                         <div className="flex flex-col">
                             <span className="uppercase text-[10px] font-bold text-emerald-400 tracking-wider">Micron</span>
                             <span className="text-emerald-900 font-bold text-sm">{selectedJob.micron}<span className="text-xs font-normal text-emerald-600 ml-0.5">µ</span></span>
                         </div>
                         <div className="w-px h-6 bg-emerald-200"></div>
                         <div className="flex flex-col">
                             <span className="uppercase text-[10px] font-bold text-emerald-400 tracking-wider">Target</span>
                             <span className="text-emerald-900 font-bold text-sm">{selectedJob.totalQuantity}<span className="text-xs font-normal text-emerald-600 ml-0.5">kg</span></span>
                         </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-4 w-full xl:w-auto border-t border-emerald-100 xl:border-t-0 pt-4 xl:pt-0">
                        {/* Start Button if Pending */}
                        {selectedJob.productionStatus === 'Pending' && (
                            <button 
                                onClick={handleStartJob}
                                className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold shadow-md hover:bg-emerald-700 transition-all uppercase text-xs tracking-wider"
                            >
                                <Play size={14} fill="currentColor" /> Start Job
                            </button>
                        )}
                        
                        {/* Completion Toggle */}
                        <div className="flex items-center gap-3 mr-4">
                            <span className={`text-xs font-bold uppercase tracking-wide ${isProdComplete ? 'text-emerald-700' : 'text-slate-400'}`}>
                                {isProdComplete ? 'Prod Complete' : 'Mark Complete'}
                            </span>
                            <button 
                                onClick={() => toggleCompletion(isProdComplete)}
                                className={`w-12 h-6 rounded-full transition-colors duration-300 relative flex items-center ${isProdComplete ? 'bg-emerald-600' : 'bg-slate-200'}`}
                            >
                                <div className={`w-5 h-5 bg-white rounded-full shadow-md absolute transition-transform duration-300 ${isProdComplete ? 'translate-x-6' : 'translate-x-1'}`}></div>
                            </button>
                        </div>

                        <button 
                            onClick={handleManualSave} 
                            className="flex-1 xl:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 text-sm uppercase tracking-wide"
                        >
                            <Save size={16} />
                            <span>Force Save</span>
                        </button>
                    </div>
                </div>
             </div>

            {/* Excel Grid Container */}
            <div className="flex-1 overflow-auto bg-slate-50 relative">
                <div className="min-w-[800px]">
                    {/* Grid Header */}
                    <div className="grid grid-cols-12 gap-px sticky top-0 z-10 text-xs uppercase font-bold text-white bg-emerald-600 border-b border-emerald-700 shadow-sm">
                        <div className="col-span-1 p-3 text-center bg-emerald-700">#</div>
                        <div className="col-span-3 p-3 text-center">Gross Weight</div>
                        <div className="col-span-2 p-3 text-center">Core Weight</div>
                        <div className="col-span-2 p-3 text-center bg-emerald-800/50">Net Weight</div>
                        <div className="col-span-2 p-3 text-center">Meter</div>
                        <div className="col-span-1 p-3 text-center">Joints</div>
                        <div className="col-span-1 p-3 text-center bg-emerald-700">Action</div>
                    </div>

                    {/* Grid Rows */}
                    <div className="bg-slate-200 flex flex-col gap-px">
                        {gridData.map((row, index) => {
                             const gross = parseFloat(row.grossWeight) || 0;
                             const core = parseFloat(row.coreWeight) || 0;
                             const net = gross - core;
                             const netClass = net > 0 ? 'text-emerald-700 font-bold' : 'text-slate-300';

                             return (
                                <div key={row.id} className="grid grid-cols-12 gap-px bg-white hover:bg-emerald-50/30 transition-colors group">
                                    <div className="col-span-1 p-2 text-center text-slate-400 text-xs flex items-center justify-center bg-slate-50">
                                        {index + 1}
                                    </div>
                                    <div className="col-span-3">
                                        <input 
                                            type="number" step="0.001"
                                            value={row.grossWeight}
                                            onChange={(e) => handleCellChange(row.id, 'grossWeight', e.target.value)}
                                            className="w-full h-full p-2.5 outline-none text-sm font-semibold text-slate-800 bg-transparent focus:bg-emerald-50/50 text-center placeholder-slate-300"
                                            placeholder="0.000"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input 
                                            type="number" step="0.001"
                                            value={row.coreWeight}
                                            onChange={(e) => handleCellChange(row.id, 'coreWeight', e.target.value)}
                                            className="w-full h-full p-2.5 outline-none text-sm font-semibold text-slate-800 bg-transparent focus:bg-emerald-50/50 text-center placeholder-slate-300"
                                            placeholder="0.000"
                                        />
                                    </div>
                                    <div className={`col-span-2 bg-emerald-50/10 flex items-center justify-center text-sm font-mono ${netClass}`}>
                                        {net > 0 ? net.toFixed(3) : '-'}
                                    </div>
                                    <div className="col-span-2">
                                        <input 
                                            type="number"
                                            value={row.meter}
                                            onChange={(e) => handleCellChange(row.id, 'meter', e.target.value)}
                                            className="w-full h-full p-2.5 outline-none text-sm font-semibold text-slate-800 bg-transparent focus:bg-emerald-50/50 text-center placeholder-slate-300"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <input 
                                            type="number"
                                            value={row.joints}
                                            onChange={(e) => handleCellChange(row.id, 'joints', e.target.value)}
                                            className="w-full h-full p-2.5 outline-none text-sm font-semibold text-slate-800 bg-transparent focus:bg-emerald-50/50 text-center placeholder-slate-300"
                                            placeholder="-"
                                        />
                                    </div>
                                    <div className="col-span-1 flex items-center justify-center">
                                        {!row.isNew && (
                                            <button onClick={() => handleDeleteRow(row.id)} className="p-1.5 text-slate-300 hover:text-red-500 rounded hover:bg-red-50 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                             );
                        })}
                    </div>
                    
                    {/* Add Row Button */}
                    <div className="p-6 bg-white">
                         <button onClick={addMoreRows} className="w-full border-2 border-dashed border-emerald-100 text-emerald-400 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 py-3 rounded-xl transition-all flex items-center justify-center gap-2 font-bold text-sm uppercase tracking-wide">
                             <Plus size={16} /> Add 5 More Lines
                         </button>
                    </div>
                </div>
            </div>

            {/* Footer Summary */}
            <div className="bg-white border-t border-slate-200 p-3 flex flex-wrap gap-4 justify-end items-center text-sm font-medium text-slate-600 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
                 <div className="px-3 py-1">Total Rows: <span className="text-slate-900 font-bold">{selectedJob.productionData.length}</span></div>
                 <div className="bg-emerald-50 px-4 py-2 rounded-lg text-emerald-700 border border-emerald-100 shadow-sm">
                     Total Net Wt: <span className="font-black text-xl ml-2">{selectedJob.productionData.reduce((a,c) => a + c.netWeight, 0).toFixed(3)} <span className="text-xs font-normal">kg</span></span>
                 </div>
            </div>

          </>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 bg-slate-50">
            <div className="text-center">
                <div className="bg-white p-6 rounded-full shadow-sm inline-block mb-4 border border-emerald-50">
                     <Activity size={48} className="text-emerald-200" />
                </div>
                <h3 className="text-lg font-bold text-slate-700">No Job Selected</h3>
                <p className="text-sm text-slate-400 mt-1">Select a job from the sidebar to start production.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductionDashboard;