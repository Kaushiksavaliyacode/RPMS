
import React, { useState, useEffect } from 'react';
import { JobCard, SlittingEntry } from '../types';
import { Search, Scissors, Save, ArrowLeft, Plus, Calculator, Trash2 } from 'lucide-react';

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
      // Find max SrNo currently in the grid
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

  const handleSave = () => {
    if (!selectedJob) return;

    const newSlittingData: SlittingEntry[] = [];

    // Iterate through all coils and their grids
    Object.entries(coilGrids).forEach(([coilId, rows]) => {
      const coilDef = selectedJob.coils.find(c => c.id === coilId);
      if (!coilDef) return;

      rows.forEach(row => {
        // Only save if there is data
        if (row.gross || row.core) {
          const gross = parseFloat(row.gross) || 0;
          const core = parseFloat(row.core) || 0;
          const net = gross - core;
          
          // Meter Formula: Net / Micron / 0.0139 / Size * 1000
          let meter = 0;
          if (selectedJob.micron > 0 && coilDef.size > 0) {
             meter = (net / selectedJob.micron / 0.0139 / coilDef.size) * 1000;
          }

          newSlittingData.push({
            id: row.isNew ? crypto.randomUUID() : row.id, // New ID for new rows
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

    // Note: This replaces all slitting data for the job with the current grid state
    // This allows for deletions (clearing a row) to be reflected
    onUpdateJob({ ...selectedJob, slittingData: newSlittingData });
    alert("Slitting Data Saved Successfully!");
  };

  // Helper to calculate live stats for display
  const calculateLiveNet = (gross: string, core: string) => {
    const g = parseFloat(gross) || 0;
    const c = parseFloat(core) || 0;
    return g - c;
  };

  const calculateLiveMeter = (net: number, coilSize: number) => {
     if (!selectedJob || selectedJob.micron <= 0 || coilSize <= 0) return 0;
     return (net / selectedJob.micron / 0.0139 / coilSize) * 1000;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100dvh-5rem)] relative bg-slate-50 font-sans">
       {/* Sidebar - Job Selection */}
       <div className={`w-full lg:w-80 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden shrink-0 h-full lg:flex ${mobileView === 'detail' ? 'hidden' : 'flex'}`}>
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-bold text-slate-800 mb-2 text-lg">Select Job</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search Job No..."
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {jobs.map(job => (
            <div
              key={job.id}
              onClick={() => handleJobSelect(job.id)}
              className={`p-4 rounded-xl cursor-pointer border transition-all ${
                selectedJobId === job.id
                  ? 'bg-emerald-50 border-emerald-500 shadow-md transform scale-[1.02]'
                  : 'bg-white border-slate-100 hover:border-emerald-300 hover:bg-slate-50'
              }`}
            >
               <div className="flex justify-between items-start mb-2">
                   <div>
                       <span className="text-lg font-black text-slate-800 block">#{job.srNo}</span>
                       <span className="text-xs font-semibold text-slate-500">{job.jobCode}</span>
                   </div>
                   <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                       job.status === 'Running' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                   }`}>
                       {job.status}
                   </span>
               </div>
               <div className="flex gap-2 mt-2 flex-wrap">
                   {job.coils.map(c => (
                       <span key={c.id} className="text-[10px] border border-slate-200 px-1.5 py-0.5 rounded bg-white text-slate-500 font-medium">{c.size}mm</span>
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
             {/* 1. STATUS BAR HEADER (Sticky) */}
             <div className="bg-slate-900 text-white p-3 sm:p-4 sticky top-0 z-30 shadow-md shrink-0">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button onClick={() => setMobileView('list')} className="lg:hidden p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                            <ArrowLeft size={20} className="text-white" />
                        </button>
                        <div>
                            <div className="flex items-baseline gap-2">
                                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">#{selectedJob.srNo}</h1>
                                <span className="text-emerald-400 font-bold font-mono text-sm">{selectedJob.jobCode}</span>
                            </div>
                        </div>
                    </div>

                    {/* Job Specs Stats */}
                    <div className="flex flex-wrap gap-2 sm:gap-6 text-xs sm:text-sm text-slate-300 w-full sm:w-auto bg-white/5 p-2 rounded-lg sm:bg-transparent sm:p-0">
                         <div className="flex flex-col sm:block">
                             <span className="uppercase text-[10px] font-bold text-slate-500 sm:text-slate-400 sm:mr-1">Total Width</span>
                             <b className="text-white text-base">{selectedJob.size}</b> <span className="text-xs">mm</span>
                         </div>
                         <div className="w-px h-8 bg-white/10 hidden sm:block"></div>
                         <div className="flex flex-col sm:block">
                             <span className="uppercase text-[10px] font-bold text-slate-500 sm:text-slate-400 sm:mr-1">Micron</span>
                             <b className="text-white text-base">{selectedJob.micron}</b> <span className="text-xs">µ</span>
                         </div>
                         <div className="w-px h-8 bg-white/10 hidden sm:block"></div>
                         <div className="flex flex-col sm:block">
                             <span className="uppercase text-[10px] font-bold text-slate-500 sm:text-slate-400 sm:mr-1">Target</span>
                             <b className="text-white text-base">{selectedJob.totalQuantity}</b> <span className="text-xs">kg</span>
                         </div>
                    </div>

                    <button 
                        onClick={handleSave} 
                        className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-bold shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <Save size={18} />
                        <span>Save All</span>
                    </button>
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
                             <div key={coil.id} className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-[500px] sm:h-[600px]">
                                 {/* Coil Header */}
                                 <div className="bg-slate-100 border-b border-slate-200 p-3 flex justify-between items-center">
                                     <div className="flex items-center gap-2">
                                         <div className="bg-slate-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                                             {index + 1}
                                         </div>
                                         <h3 className="font-bold text-slate-800">{coil.label}</h3>
                                         <span className="bg-white border border-slate-300 px-2 py-0.5 rounded text-xs font-mono font-bold text-slate-600">
                                             {coil.size} mm
                                         </span>
                                     </div>
                                     <div className="text-xs font-medium text-slate-500">
                                         Total: <span className="text-emerald-600 font-bold text-sm">{coilTotal.toFixed(3)} kg</span>
                                     </div>
                                 </div>

                                 {/* Separate Table for this Coil */}
                                 <div className="flex-1 overflow-auto relative bg-white">
                                     <table className="w-full text-left border-collapse">
                                         <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold sticky top-0 z-10 shadow-sm">
                                             <tr>
                                                 <th className="p-3 border-b border-r border-slate-200 w-16 text-center">Sr</th>
                                                 <th className="p-3 border-b border-r border-slate-200 bg-blue-50/30 text-center">Gross</th>
                                                 <th className="p-3 border-b border-r border-slate-200 bg-blue-50/30 text-center">Core</th>
                                                 <th className="p-3 border-b border-r border-slate-200 bg-emerald-50/30 text-emerald-700 text-center">Net</th>
                                                 <th className="p-3 border-b border-slate-200 text-slate-400 text-center hidden sm:table-cell">Meter</th>
                                                 <th className="p-3 border-b border-slate-200 w-10"></th>
                                             </tr>
                                         </thead>
                                         <tbody className="text-sm">
                                             {rows.map((row) => {
                                                 const net = calculateLiveNet(row.gross, row.core);
                                                 const meter = calculateLiveMeter(net, coil.size);

                                                 return (
                                                     <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50 group">
                                                         <td className="p-1 border-r border-slate-100">
                                                             <input 
                                                                 type="text" 
                                                                 value={row.srNo}
                                                                 onChange={(e) => handleCellChange(coil.id, row.id, 'srNo', e.target.value)}
                                                                 className="w-full text-center font-bold text-slate-600 outline-none bg-transparent p-2"
                                                             />
                                                         </td>
                                                         <td className="p-1 border-r border-slate-100 bg-blue-50/10">
                                                             <input 
                                                                 type="number" step="0.001"
                                                                 placeholder="0.000"
                                                                 value={row.gross}
                                                                 onChange={(e) => handleCellChange(coil.id, row.id, 'gross', e.target.value)}
                                                                 className="w-full text-center font-medium text-slate-900 outline-none bg-transparent p-2 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded transition-all"
                                                             />
                                                         </td>
                                                         <td className="p-1 border-r border-slate-100 bg-blue-50/10">
                                                             <input 
                                                                 type="number" step="0.001"
                                                                 placeholder="0.000"
                                                                 value={row.core}
                                                                 onChange={(e) => handleCellChange(coil.id, row.id, 'core', e.target.value)}
                                                                 className="w-full text-center font-medium text-slate-900 outline-none bg-transparent p-2 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded transition-all"
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
                                                                     className="text-slate-300 hover:text-red-500 p-1 rounded hover:bg-red-50"
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
                                     <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                                         <button 
                                             onClick={() => handleAddRows(coil.id)}
                                             className="w-full py-2 border border-dashed border-slate-300 rounded-lg text-slate-500 text-xs font-bold hover:bg-white hover:border-emerald-300 hover:text-emerald-600 transition-all flex items-center justify-center gap-2"
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
