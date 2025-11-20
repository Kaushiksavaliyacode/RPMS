import React, { useState, useEffect } from 'react';
import { JobCard, SlittingEntry, JobStatus } from '../types';
import { Search, Scissors, Save, ArrowLeft, Plus, Calculator, Trash2, Check } from 'lucide-react';

interface SlittingDashboardProps {
  jobs: JobCard[];
  onUpdateJob: (job: JobCard) => void;
}

interface GridRow {
  id: string; // local temp id or db id
  srNo: string;
  gross: string;
  core: string;
  isNew: boolean;
}

// State structure: Keyed by Coil ID -> Array of Rows
type CoilGridState = Record<string, GridRow[]>;

const SlittingDashboard: React.FC<SlittingDashboardProps> = ({ jobs, onUpdateJob }) => {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  
  // Separate grid data for each coil
  const [coilGrids, setCoilGrids] = useState<CoilGridState>({});
  
  const selectedJob = jobs.find(j => j.id === selectedJobId);

  // Initialize Grids when Job changes
  useEffect(() => {
    if (selectedJob) {
      const newGrids: CoilGridState = {};

      selectedJob.coils.forEach(coil => {
        // Filter existing data for this coil
        const coilData = selectedJob.slittingData
          .filter(d => d.coilId === coil.id)
          .sort((a, b) => Number(a.srNo) - Number(b.srNo)); // Sort by SrNo

        // Find max SrNo to start new rows from
        let maxSr = 0;
        coilData.forEach(d => {
           const n = parseInt(d.srNo);
           if (!isNaN(n) && n > maxSr) maxSr = n;
        });

        // Convert existing DB entries to GridRow format
        const existingRows: GridRow[] = coilData.map(d => ({
          id: d.id,
          srNo: d.srNo,
          gross: d.grossWeight.toString(),
          core: d.coreWeight.toString(),
          isNew: false
        }));

        // Generate 5 empty rows
        const emptyRows: GridRow[] = Array(5).fill(null).map((_, i) => ({
          id: crypto.randomUUID(),
          srNo: (maxSr + i + 1).toString(),
          gross: '',
          core: '',
          isNew: true
        }));

        newGrids[coil.id] = [...existingRows, ...emptyRows];
      });

      setCoilGrids(newGrids);
    } else {
      setCoilGrids({});
    }
  }, [selectedJob]);

  const handleJobSelect = (id: string) => {
      setSelectedJobId(id);
      setMobileView('detail');
  }

  const handleCellChange = (coilId: string, rowId: string, field: keyof GridRow, value: string) => {
    setCoilGrids(prev => ({
      ...prev,
      [coilId]: prev[coilId].map(row => {
        if (row.id === rowId) {
          return { ...row, [field]: value };
        }
        return row;
      })
    }));
  };

  const handleAddRows = (coilId: string) => {
    setCoilGrids(prev => {
      const currentRows = prev[coilId];
      let maxSr = 0;
      currentRows.forEach(r => {
        const n = parseInt(r.srNo);
        if (!isNaN(n) && n > maxSr) maxSr = n;
      });

      const newRows = Array(5).fill(null).map((_, i) => ({
        id: crypto.randomUUID(),
        srNo: (maxSr + i + 1).toString(),
        gross: '',
        core: '',
        isNew: true
      }));

      return {
        ...prev,
        [coilId]: [...currentRows, ...newRows]
      };
    });
  };

  const handleDeleteRow = (coilId: string, rowId: string) => {
      setCoilGrids(prev => ({
          ...prev,
          [coilId]: prev[coilId].filter(r => r.id !== rowId)
      }));
  }

  const toggleCompletion = (currentState: boolean) => {
      if(!selectedJob) return;

      const hasData = selectedJob.slittingData.length > 0;
      const newStatus: JobStatus = !currentState ? 'Completed' : (hasData ? 'Running' : 'Pending');

      onUpdateJob({
          ...selectedJob,
          slittingStatus: newStatus
      });
  }

  const handleSave = () => {
    if (!selectedJob) return;

    const newSlittingData: SlittingEntry[] = [];

    Object.entries(coilGrids).forEach(([coilId, rows]) => {
      const coilDef = selectedJob.coils.find(c => c.id === coilId);
      if (!coilDef) return;

      rows.forEach(row => {
        if (row.gross || row.core) {
          const gross = parseFloat(row.gross) || 0;
          const core = parseFloat(row.core) || 0;
          const net = gross - core;
          
          let meter = 0;
          if (selectedJob.micron > 0 && coilDef.size > 0) {
             meter = (net / selectedJob.micron / 0.0139 / coilDef.size) * 1000;
          }

          newSlittingData.push({
            id: row.isNew ? crypto.randomUUID() : row.id,
            coilId: coilId,
            srNo: row.srNo,
            grossWeight: gross,
            coreWeight: core,
            netWeight: net,
            meter: meter,
            timestamp: new Date().toLocaleString()
          });
        }
      });
    });

    const currentIsComplete = selectedJob.slittingStatus === 'Completed';
    let newStatus: JobStatus = currentIsComplete ? 'Completed' : (newSlittingData.length > 0 ? 'Running' : 'Pending');

    onUpdateJob({ 
        ...selectedJob, 
        slittingData: newSlittingData, 
        slittingStatus: newStatus 
    });
    alert("Slitting Data Saved Successfully!");
  };

  const calculateLiveNet = (gross: string, core: string) => {
    const g = parseFloat(gross) || 0;
    const c = parseFloat(core) || 0;
    return g - c;
  };

  const calculateLiveMeter = (net: number, coilSize: number) => {
     if (!selectedJob || selectedJob.micron <= 0 || coilSize <= 0) return 0;
     return (net / selectedJob.micron / 0.0139 / coilSize) * 1000;
  };

  const isSlitComplete = selectedJob?.slittingStatus === 'Completed';

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100dvh-5rem)] relative bg-slate-50 font-sans">
       {/* Sidebar - Job Selection */}
       <div className={`w-full lg:w-80 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden shrink-0 h-full lg:flex ${mobileView === 'detail' ? 'hidden' : 'flex'}`}>
        <div className="p-4 border-b border-slate-100 bg-white sticky top-0 z-10">
          <h2 className="font-bold text-slate-800 mb-3 text-lg">Slitting Jobs</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search Job No..."
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-slate-50/50">
          {jobs.map(job => (
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
                   <span className="text-lg font-black text-slate-800 block">#{job.srNo}</span>
                   <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                       job.slittingStatus === 'Running' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                       job.slittingStatus === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                   }`}>
                       {job.slittingStatus}
                   </span>
               </div>
               <p className="text-xs font-bold text-slate-400 truncate uppercase tracking-wide mb-2">{job.jobCode}</p>
               <div className="flex gap-1 mt-2 flex-wrap">
                   {job.coils.map(c => (
                       <span key={c.id} className="text-[10px] border border-slate-100 px-1.5 py-0.5 rounded bg-slate-50 text-slate-600 font-bold">{c.size}mm</span>
                   ))}
               </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Detail Area */}
      <div className={`flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden relative ${mobileView === 'list' ? 'hidden' : 'flex'}`}>
        {selectedJob ? (
          <>
             {/* 1. LIGHT STATUS BAR HEADER (Sticky) */}
             <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-30 shadow-sm shrink-0">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                    
                    <div className="flex items-center gap-4 w-full xl:w-auto">
                        <button onClick={() => setMobileView('list')} className="lg:hidden p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-600">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <div className="flex items-baseline gap-2">
                                <h1 className="text-2xl font-black tracking-tight text-slate-800">#{selectedJob.srNo}</h1>
                                <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-sm font-bold font-mono border border-emerald-100">{selectedJob.jobCode}</span>
                            </div>
                        </div>
                    </div>

                    {/* Job Specs Stats */}
                    <div className="flex flex-wrap items-center gap-4 sm:gap-8 w-full xl:w-auto bg-slate-50 xl:bg-transparent p-3 xl:p-0 rounded-lg border border-slate-100 xl:border-0">
                         <div className="flex flex-col">
                             <span className="uppercase text-[10px] font-bold text-slate-400 tracking-wider">Width</span>
                             <span className="text-slate-800 font-bold text-sm">{selectedJob.size}<span className="text-xs font-normal text-slate-500 ml-0.5">mm</span></span>
                         </div>
                         <div className="w-px h-6 bg-slate-200"></div>
                         <div className="flex flex-col">
                             <span className="uppercase text-[10px] font-bold text-slate-400 tracking-wider">Micron</span>
                             <span className="text-slate-800 font-bold text-sm">{selectedJob.micron}<span className="text-xs font-normal text-slate-500 ml-0.5">µ</span></span>
                         </div>
                         <div className="w-px h-6 bg-slate-200"></div>
                         <div className="flex flex-col">
                             <span className="uppercase text-[10px] font-bold text-slate-400 tracking-wider">Target</span>
                             <span className="text-slate-800 font-bold text-sm">{selectedJob.totalQuantity}<span className="text-xs font-normal text-slate-500 ml-0.5">kg</span></span>
                         </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-4 w-full xl:w-auto border-t xl:border-t-0 pt-4 xl:pt-0 border-slate-100">
                         {/* Completion Toggle */}
                         <div className="flex items-center gap-3 mr-4">
                            <span className={`text-xs font-bold uppercase tracking-wide ${isSlitComplete ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {isSlitComplete ? 'Slit Complete' : 'Mark Complete'}
                            </span>
                            <button 
                                onClick={() => toggleCompletion(isSlitComplete)}
                                className={`w-12 h-6 rounded-full transition-colors duration-300 relative flex items-center ${isSlitComplete ? 'bg-emerald-500' : 'bg-slate-200'}`}
                            >
                                <div className={`w-5 h-5 bg-white rounded-full shadow-md absolute transition-transform duration-300 ${isSlitComplete ? 'translate-x-6' : 'translate-x-1'}`}></div>
                            </button>
                        </div>

                        <button 
                            onClick={handleSave} 
                            className="flex-1 xl:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 text-sm uppercase tracking-wide"
                        >
                            <Save size={16} />
                            <span>Save All</span>
                        </button>
                    </div>
                </div>
             </div>

             {/* 2. SCROLLABLE CONTENT AREA */}
             <div className="flex-1 overflow-y-auto bg-slate-50 p-2 sm:p-4">
                 
                 {/* Grid Layout for Coils */}
                 <div className={`grid grid-cols-1 ${selectedJob.coils.length > 1 ? 'xl:grid-cols-2' : ''} gap-4`}>
                     
                     {selectedJob.coils.map((coil, index) => {
                         const rows = coilGrids[coil.id] || [];
                         const coilTotal = rows.reduce((acc, row) => acc + calculateLiveNet(row.gross, row.core), 0);

                         return (
                             <div key={coil.id} className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-[500px] sm:h-[600px] hover:border-emerald-300 transition-colors">
                                 {/* Coil Header */}
                                 <div className="bg-slate-50 border-b border-slate-200 p-3 flex justify-between items-center">
                                     <div className="flex items-center gap-3">
                                         <div className="bg-white border border-slate-200 text-slate-700 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shadow-sm">
                                             {index + 1}
                                         </div>
                                         <div>
                                             <h3 className="font-bold text-slate-800 text-sm">{coil.label}</h3>
                                             <span className="text-xs text-slate-400 font-medium">Target Size: {coil.size}mm</span>
                                         </div>
                                     </div>
                                     <div className="text-right">
                                         <p className="text-[10px] font-bold uppercase text-slate-400">Total Output</p>
                                         <p className="text-emerald-600 font-black text-lg leading-none">{coilTotal.toFixed(3)}</p>
                                     </div>
                                 </div>

                                 {/* Separate Table for this Coil */}
                                 <div className="flex-1 overflow-auto relative bg-white">
                                     <table className="w-full text-left border-collapse">
                                         <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold sticky top-0 z-10 shadow-sm">
                                             <tr>
                                                 <th className="p-3 border-b border-r border-slate-200 w-16 text-center">Sr</th>
                                                 <th className="p-3 border-b border-r border-slate-200 text-center">Gross</th>
                                                 <th className="p-3 border-b border-r border-slate-200 text-center">Core</th>
                                                 <th className="p-3 border-b border-r border-slate-200 bg-emerald-50 text-emerald-700 text-center">Net</th>
                                                 <th className="p-3 border-b border-slate-200 text-slate-400 text-center hidden sm:table-cell">Meter</th>
                                                 <th className="p-3 border-b border-slate-200 w-10"></th>
                                             </tr>
                                         </thead>
                                         <tbody className="text-sm">
                                             {rows.map((row) => {
                                                 const net = calculateLiveNet(row.gross, row.core);
                                                 const meter = calculateLiveMeter(net, coil.size);

                                                 return (
                                                     <tr key={row.id} className="border-b border-slate-100 hover:bg-emerald-50/20 transition-colors group">
                                                         <td className="p-1 border-r border-slate-100">
                                                             <input 
                                                                 type="text" 
                                                                 value={row.srNo}
                                                                 onChange={(e) => handleCellChange(coil.id, row.id, 'srNo', e.target.value)}
                                                                 className="w-full text-center font-bold text-slate-600 outline-none bg-transparent p-2 focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-sm"
                                                             />
                                                         </td>
                                                         <td className="p-1 border-r border-slate-100">
                                                             <input 
                                                                 type="number" step="0.001"
                                                                 placeholder="0.000"
                                                                 value={row.gross}
                                                                 onChange={(e) => handleCellChange(coil.id, row.id, 'gross', e.target.value)}
                                                                 className="w-full text-center font-medium text-slate-900 outline-none bg-transparent p-2 focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded transition-all placeholder-slate-300"
                                                             />
                                                         </td>
                                                         <td className="p-1 border-r border-slate-100">
                                                             <input 
                                                                 type="number" step="0.001"
                                                                 placeholder="0.000"
                                                                 value={row.core}
                                                                 onChange={(e) => handleCellChange(coil.id, row.id, 'core', e.target.value)}
                                                                 className="w-full text-center font-medium text-slate-900 outline-none bg-transparent p-2 focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded transition-all placeholder-slate-300"
                                                             />
                                                         </td>
                                                         <td className="p-2 border-r border-slate-100 text-center font-bold text-emerald-600 bg-emerald-50/10">
                                                             {net > 0 ? net.toFixed(3) : '-'}
                                                         </td>
                                                         <td className="p-2 text-center font-mono text-slate-500 text-xs hidden sm:table-cell">
                                                             {meter > 0 ? Math.round(meter) : '-'}
                                                         </td>
                                                         <td className="p-1 text-center">
                                                             {!row.isNew && (
                                                                 <button 
                                                                     onClick={() => handleDeleteRow(coil.id, row.id)}
                                                                     className="text-slate-300 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
                                                                 >
                                                                     <Trash2 size={14} />
                                                                 </button>
                                                             )}
                                                         </td>
                                                     </tr>
                                                 );
                                             })}
                                         </tbody>
                                     </table>
                                     
                                     {/* Bottom Add Button within Table */}
                                     <div className="p-3 border-t border-slate-100 bg-slate-50/50 sticky bottom-0">
                                         <button 
                                             onClick={() => handleAddRows(coil.id)}
                                             className="w-full py-2 border border-dashed border-slate-300 rounded-lg text-slate-400 text-xs font-bold hover:bg-white hover:border-emerald-300 hover:text-emerald-600 transition-all flex items-center justify-center gap-2 uppercase tracking-wide"
                                         >
                                             <Plus size={14} /> Add 5 More Rows
                                         </button>
                                     </div>
                                 </div>
                             </div>
                         );
                     })}
                 </div>
             </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50 p-8 text-center">
            <div className="bg-white p-6 rounded-full shadow-sm mb-4">
                <Scissors size={48} className="text-emerald-200" />
            </div>
            <h3 className="text-lg font-bold text-slate-700">No Job Selected</h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2">Select a pending job from the list to start entering coil data.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SlittingDashboard;