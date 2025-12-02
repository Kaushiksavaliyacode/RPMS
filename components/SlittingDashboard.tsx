

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { JobCard, SlittingEntry, JobStatus } from '../types';
import { Search, Scissors, Save, ArrowLeft, Plus, Trash2, CloudLightning, Printer, CheckSquare, Square, Plug, PlugZap, Settings, X, FileText, HelpCircle } from 'lucide-react';
import { openLocalFile, writeToLocalFile, isFileSystemSupported } from '../services/fileSystem';

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
  const [isSaving, setIsSaving] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState('');
  
  // Label Printing Selection State: Set of composite IDs "coilId_rowId"
  const [selectedForPrint, setSelectedForPrint] = useState<Set<string>>(new Set());
  
  // Print Settings State
  const [showPrintSettings, setShowPrintSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false); // Tutorial State
  const [printConfig, setPrintConfig] = useState({
      append: true, // Default to Append for Packing Lists
      includeHeaders: false, // Default false for append mode
      columnNames: {
          jobNo: 'JobNo',
          jobCode: 'JobCode',
          size: 'Size',
          micron: 'Micron',
          srNo: 'RollNo',
          gross: 'GrossWt',
          core: 'CoreWt',
          net: 'NetWt',
          meter: 'Meter',
          date: 'Date'
      }
  });

  // Local File Handle State
  const [fileHandle, setFileHandle] = useState<any>(null);

  // Separate grid data for each coil
  const [coilGrids, setCoilGrids] = useState<CoilGridState>({});
  
  // Refs for auto-save
  const isTypingRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  // Initialize Grids when Job changes or when not typing
  useEffect(() => {
    if (selectedJob && !isTypingRef.current) {
      const newGrids: CoilGridState = {};

      selectedJob.coils.forEach(coil => {
        // Filter existing data for this coil
        const coilData = selectedJob.slittingData
          .filter(d => d.coilId === coil.id)
          .sort((a, b) => Number(a.srNo) - Number(b.srNo));

        // Find max SrNo
        let maxSr = 0;
        coilData.forEach(d => {
           const n = parseInt(d.srNo);
           if (!isNaN(n) && n > maxSr) maxSr = n;
        });

        const existingRows: GridRow[] = coilData.map(d => ({
          id: d.id,
          srNo: d.srNo,
          gross: d.grossWeight.toString(),
          core: d.coreWeight.toString(),
          isNew: false
        }));

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
      setSelectedForPrint(new Set()); // Reset selections on job change
    } else if (!selectedJob) {
      setCoilGrids({});
    }
  }, [selectedJob?.id, selectedJob?.slittingData]);

  const handleJobSelect = (id: string) => {
      setSelectedJobId(id);
      setMobileView('detail');
      isTypingRef.current = false;
      setCoilGrids({});
  }

  // --- FORMAT DATA FUNCTION ---
  const getFormattedData = (currentGrids: CoilGridState) => {
    if (!selectedJob) return [];
    const newSlittingData: SlittingEntry[] = [];

    Object.entries(currentGrids).forEach(([coilId, rows]) => {
      const coilDef = selectedJob.coils.find(c => c.id === coilId);
      if (!coilDef) return;

      (rows as GridRow[]).forEach(row => {
        if (row.gross || row.core) {
          const gross = parseFloat(row.gross) || 0;
          const core = parseFloat(row.core) || 0;
          const net = gross - core;
          
          let meter = 0;
          if (selectedJob.micron > 0 && coilDef.size > 0) {
             meter = (net / selectedJob.micron / 0.00139 / coilDef.size) * 1000;
          }

          newSlittingData.push({
            id: row.isNew ? crypto.randomUUID() : row.id,
            coilId: coilId,
            srNo: row.srNo,
            grossWeight: gross,
            coreWeight: core,
            netWeight: net,
            meter: meter,
            timestamp: row.isNew ? new Date().toLocaleString() : (selectedJob.slittingData.find(d => d.id === row.id)?.timestamp || new Date().toLocaleString())
          });
        }
      });
    });
    return newSlittingData;
  };

  // --- AUTO SAVE ---
  const triggerAutoSave = useCallback((newGrids: CoilGridState) => {
    if (!selectedJob) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    setIsSaving(true);

    saveTimeoutRef.current = setTimeout(() => {
        const formatted = getFormattedData(newGrids);
        
        const currentIsComplete = selectedJob.slittingStatus === 'Completed';
        const newStatus = currentIsComplete ? 'Completed' : (formatted.length > 0 ? 'Running' : 'Pending');

        onUpdateJob({ 
            ...selectedJob, 
            slittingData: formatted, 
            slittingStatus: newStatus 
        });
        
        setIsSaving(false);
        isTypingRef.current = false;
    }, 1500);
  }, [selectedJob, onUpdateJob]);


  const handleCellChange = (coilId: string, rowId: string, field: keyof GridRow, value: string) => {
    isTypingRef.current = true;
    const newGrids = {
      ...coilGrids,
      [coilId]: coilGrids[coilId].map(row => {
        if (row.id === rowId) {
          return { ...row, [field]: value };
        }
        return row;
      })
    };
    setCoilGrids(newGrids);
    triggerAutoSave(newGrids);
  };

  const handleAddRows = (coilId: string) => {
    const newGrids = { ...coilGrids };
    const currentRows = newGrids[coilId];
    
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

    newGrids[coilId] = [...currentRows, ...newRows];
    setCoilGrids(newGrids);
  };

  const handleDeleteRow = (coilId: string, rowId: string) => {
      const newGrids = {
          ...coilGrids,
          [coilId]: coilGrids[coilId].filter(r => r.id !== rowId)
      };
      setCoilGrids(newGrids);
      triggerAutoSave(newGrids);
      
      // Remove from selection if deleted
      const compositeId = `${coilId}_${rowId}`;
      if (selectedForPrint.has(compositeId)) {
        const newSet = new Set(selectedForPrint);
        newSet.delete(compositeId);
        setSelectedForPrint(newSet);
      }
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

  const handleManualSave = () => {
    if (!selectedJob) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    const formatted = getFormattedData(coilGrids);
    const currentIsComplete = selectedJob.slittingStatus === 'Completed';
    const newStatus = currentIsComplete ? 'Completed' : (formatted.length > 0 ? 'Running' : 'Pending');

    onUpdateJob({ 
        ...selectedJob, 
        slittingData: formatted, 
        slittingStatus: newStatus 
    });
    setIsSaving(false);
    isTypingRef.current = false;
    alert("Slitting Data Saved.");
  };

  const handleConnectFile = async () => {
    try {
      const handle = await openLocalFile();
      setFileHandle(handle);
      alert("Successfully connected to local database file.");
    } catch (error) {
      console.error("File connection failed:", error);
      alert("Could not connect to file. Ensure you are using a supported browser (Chrome/Edge on Desktop).");
    }
  };

  // --- LABEL PRINTING / EXPORT CSV ---
  const handlePrintLabels = async () => {
      if (!selectedJob || selectedForPrint.size === 0) {
          alert("Please select rows to print first.");
          return;
      }

      const cols = printConfig.columnNames;
      
      // 1. Build CSV Header (Only if enabled)
      // Note: \r\n for Windows compatibility
      let csvContent = "";
      if (printConfig.includeHeaders) {
          csvContent += `${cols.jobNo},${cols.jobCode},${cols.size},${cols.micron},${cols.srNo},${cols.gross},${cols.core},${cols.net},${cols.meter},${cols.date}\r\n`;
      }

      // 2. Iterate grids and find selected rows
      let count = 0;
      Object.entries(coilGrids).forEach(([coilId, rows]) => {
          const coilDef = selectedJob.coils.find(c => c.id === coilId);
          if (!coilDef) return;

          (rows as GridRow[]).forEach(row => {
              const compositeId = `${coilId}_${row.id}`;
              if (selectedForPrint.has(compositeId)) {
                  const gross = parseFloat(row.gross) || 0;
                  const core = parseFloat(row.core) || 0;
                  const net = gross - core;
                  const meter = calculateLiveMeter(net, coilDef.size);
                  const date = selectedJob.slittingData.find(d => d.id === row.id)?.timestamp || new Date().toLocaleDateString();

                  // CSV Row - Fixed structure but headers above match the structure
                  const csvRow = `${selectedJob.srNo},${selectedJob.jobCode},${coilDef.size},${selectedJob.micron},${row.srNo},${gross.toFixed(3)},${core.toFixed(3)},${net.toFixed(3)},${meter.toFixed(0)},${date.replace(/,/g, '')}`;
                  csvContent += csvRow + "\r\n";
                  count++;
              }
          });
      });

      if (count === 0) return;

      // 3. Output Strategy
      if (fileHandle) {
          try {
             // Write directly to local file (with append logic)
             await writeToLocalFile(fileHandle, csvContent, printConfig.append);
             alert(`Successfully wrote ${count} rows to local file.`);
          } catch (e) {
             console.error("Write failed", e);
             alert("Failed to write to local file. Check permissions or reconnect DB.");
             setFileHandle(null);
          }
      } else {
          // Fallback: Trigger Download
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement("a");
          const url = URL.createObjectURL(blob);
          link.setAttribute("href", url);
          link.setAttribute("download", `PackingList_${selectedJob.srNo}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      }
  };

  const toggleRowSelection = (coilId: string, rowId: string) => {
      const compositeId = `${coilId}_${rowId}`;
      const newSet = new Set(selectedForPrint);
      if (newSet.has(compositeId)) {
          newSet.delete(compositeId);
      } else {
          newSet.add(compositeId);
      }
      setSelectedForPrint(newSet);
  };

  const toggleSelectAllCoil = (coilId: string) => {
      const rows = coilGrids[coilId] || [];
      const validRows = rows.filter(r => r.gross && r.gross !== '0'); // Only select rows with data
      
      const allSelected = validRows.every(r => selectedForPrint.has(`${coilId}_${r.id}`));
      const newSet = new Set(selectedForPrint);
      
      validRows.forEach(r => {
          const compositeId = `${coilId}_${r.id}`;
          if (allSelected) {
              newSet.delete(compositeId);
          } else {
              newSet.add(compositeId);
          }
      });
      setSelectedForPrint(newSet);
  };

  const calculateLiveNet = (gross: string, core: string) => {
    const g = parseFloat(gross) || 0;
    const c = parseFloat(core) || 0;
    return g - c;
  };

  const calculateLiveMeter = (net: number, coilSize: number) => {
     if (!selectedJob || selectedJob.micron <= 0 || coilSize <= 0) return 0;
     return (net / selectedJob.micron / 0.00139 / coilSize) * 1000;
  };

  const isSlitComplete = selectedJob?.slittingStatus === 'Completed';
  
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
       {/* Sidebar - Job Selection */}
       <div className={`w-full lg:w-80 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden shrink-0 h-full lg:flex ${mobileView === 'detail' ? 'hidden' : 'flex'}`}>
        <div className="p-4 border-b border-slate-100 bg-white sticky top-0 z-10">
          <h2 className="font-bold text-slate-800 mb-3 text-lg">Slitting Jobs</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search No, Code, Size..."
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
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
                    ? 'bg-white border-blue-500 shadow-md ring-1 ring-blue-500 relative z-10'
                    : 'bg-white border-slate-100 hover:border-blue-300 hover:shadow-sm'
                }`}
                >
                <div className="flex justify-between items-center mb-2">
                    <span className="text-lg font-black text-slate-800 block">#{job.srNo}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                        job.slittingStatus === 'Running' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                        job.slittingStatus === 'Completed' ? 'bg-blue-600 text-white border-blue-700 shadow-sm' : 'bg-slate-50 text-slate-400 border-slate-100'
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
            ))
          )}
        </div>
      </div>

      {/* Main Detail Area */}
      <div className={`flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden relative ${mobileView === 'list' ? 'hidden' : 'flex'}`}>
        {selectedJob ? (
          <>
             {/* 1. LIGHT STATUS BAR HEADER (Sticky) */}
             <div className="bg-blue-50/50 border-b border-blue-100 p-4 sticky top-0 z-30 shadow-sm shrink-0">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                    
                    <div className="flex items-center gap-4 w-full xl:w-auto">
                        <button onClick={() => setMobileView('list')} className="lg:hidden p-2 bg-white hover:bg-slate-50 rounded-full transition-colors text-slate-600 shadow-sm">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <div className="flex items-baseline gap-2">
                                <h1 className="text-2xl font-black tracking-tight text-blue-950">#{selectedJob.srNo}</h1>
                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-sm font-bold font-mono border border-blue-200">{selectedJob.jobCode}</span>
                                {isSaving && <span className="text-[10px] flex items-center gap-1 text-blue-600 animate-pulse font-bold uppercase"><CloudLightning size={12}/> Saving...</span>}
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-4 w-full xl:w-auto border-t border-blue-100 xl:border-t-0 pt-4 xl:pt-0 justify-end">
                        
                        {/* Print Settings Button */}
                        <button 
                             onClick={() => setShowPrintSettings(true)}
                             className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                             title="Print Configuration"
                        >
                            <Settings size={20} />
                        </button>

                        {/* Help / Guide Button */}
                        <button
                             onClick={() => setShowHelp(true)}
                             className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                             title="Connection Help"
                        >
                            <HelpCircle size={20} />
                        </button>

                        {/* Connect DB Button */}
                        {isFileSystemSupported() && (
                            <button
                                onClick={handleConnectFile}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all border ${
                                    fileHandle 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                }`}
                                title={fileHandle ? "Connected to local file" : "Connect to local Excel/CSV file"}
                            >
                                {fileHandle ? <PlugZap size={14} className="text-emerald-500" /> : <Plug size={14} />}
                                {fileHandle ? "DB Connected" : "Connect DB"}
                            </button>
                        )}

                        {/* Print Bartender Labels Button */}
                        {selectedForPrint.size > 0 && (
                            <button
                                onClick={handlePrintLabels}
                                className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg font-bold shadow-md hover:bg-slate-900 transition-all uppercase text-xs tracking-wider animate-in fade-in zoom-in"
                            >
                                <Printer size={14} />
                                Print {selectedForPrint.size} Labels
                            </button>
                        )}

                        <button 
                            onClick={handleManualSave} 
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 text-xs uppercase tracking-wide"
                        >
                            <Save size={14} />
                            <span>Save</span>
                        </button>

                         {/* Completion Toggle */}
                         <div className="flex items-center gap-2 ml-2">
                            <button 
                                onClick={() => toggleCompletion(isSlitComplete)}
                                className={`w-10 h-6 rounded-full transition-colors duration-300 relative flex items-center ${isSlitComplete ? 'bg-blue-600' : 'bg-slate-200'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full shadow-md absolute transition-transform duration-300 ${isSlitComplete ? 'translate-x-5' : 'translate-x-1'}`}></div>
                            </button>
                        </div>
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
                         
                         // Check if all valid rows are selected
                         const validRows = rows.filter(r => r.gross && r.gross !== '0');
                         const isAllSelected = validRows.length > 0 && validRows.every(r => selectedForPrint.has(`${coil.id}_${r.id}`));

                         return (
                             <div key={coil.id} className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-[500px] sm:h-[600px] hover:border-blue-300 transition-colors">
                                 {/* Coil Header */}
                                 <div className="bg-slate-50 border-b border-slate-200 p-3 flex justify-between items-center">
                                     <div className="flex items-center gap-3">
                                         <div className="bg-white border border-slate-200 text-slate-700 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shadow-sm">
                                             {index + 1}
                                         </div>
                                         <div>
                                             <h3 className="font-black text-slate-800 text-lg leading-tight">{coil.size}mm</h3>
                                             <div className="flex items-center gap-3 mt-1">
                                                 <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                                     Rolls: {coil.totalRolls || 0}
                                                 </span>
                                             </div>
                                         </div>
                                     </div>
                                     <div className="text-right">
                                         <p className="text-[10px] font-bold uppercase text-slate-400">Total Output</p>
                                         <p className="text-blue-600 font-black text-lg leading-none">{coilTotal.toFixed(3)}</p>
                                     </div>
                                 </div>

                                 {/* Separate Table for this Coil */}
                                 <div className="flex-1 overflow-auto relative bg-white">
                                     <table className="w-full text-left border-collapse">
                                         <thead className="bg-blue-600 text-xs uppercase text-white font-bold sticky top-0 z-10 shadow-sm">
                                             <tr>
                                                 <th className="p-3 border-b border-r border-blue-700 w-10 text-center bg-blue-700 cursor-pointer hover:bg-blue-600" onClick={() => toggleSelectAllCoil(coil.id)}>
                                                     {isAllSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                                                 </th>
                                                 <th className="p-3 border-b border-r border-blue-700 w-16 text-center bg-blue-700">Sr</th>
                                                 <th className="p-3 border-b border-r border-blue-500 text-center">Gross</th>
                                                 <th className="p-3 border-b border-r border-blue-500 text-center">Core</th>
                                                 <th className="p-3 border-b border-r border-blue-500 bg-blue-800 text-white text-center">Net</th>
                                                 <th className="p-3 border-b border-blue-500 text-blue-100 text-center hidden sm:table-cell">Meter</th>
                                                 <th className="p-3 border-b border-blue-700 w-10 bg-blue-700"></th>
                                             </tr>
                                         </thead>
                                         <tbody className="text-sm">
                                             {rows.map((row) => {
                                                 const net = calculateLiveNet(row.gross, row.core);
                                                 const meter = calculateLiveMeter(net, coil.size);
                                                 const isSelected = selectedForPrint.has(`${coil.id}_${row.id}`);
                                                 const hasData = row.gross && row.gross !== '0';

                                                 return (
                                                     <tr key={row.id} className={`border-b border-slate-100 transition-colors group ${isSelected ? 'bg-blue-50' : 'hover:bg-blue-50/20'}`}>
                                                         <td className="p-1 border-r border-slate-100 text-center">
                                                            {hasData && (
                                                                <button onClick={() => toggleRowSelection(coil.id, row.id)} className="text-blue-600 hover:text-blue-800">
                                                                    {isSelected ? <CheckSquare size={16} /> : <Square size={16} className="text-slate-300" />}
                                                                </button>
                                                            )}
                                                         </td>
                                                         <td className="p-1 border-r border-slate-100">
                                                             <input 
                                                                 type="text" 
                                                                 value={row.srNo}
                                                                 onChange={(e) => handleCellChange(coil.id, row.id, 'srNo', e.target.value)}
                                                                 className="w-full text-center font-bold text-slate-600 outline-none bg-transparent p-2 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-sm"
                                                             />
                                                         </td>
                                                         <td className="p-1 border-r border-slate-100">
                                                             <input 
                                                                 type="number" step="0.001"
                                                                 placeholder="0.000"
                                                                 value={row.gross}
                                                                 onChange={(e) => handleCellChange(coil.id, row.id, 'gross', e.target.value)}
                                                                 className="w-full text-center font-medium text-slate-900 outline-none bg-transparent p-2 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded transition-all placeholder-slate-300"
                                                             />
                                                         </td>
                                                         <td className="p-1 border-r border-slate-100">
                                                             <input 
                                                                 type="number" step="0.001"
                                                                 placeholder="0.000"
                                                                 value={row.core}
                                                                 onChange={(e) => handleCellChange(coil.id, row.id, 'core', e.target.value)}
                                                                 className="w-full text-center font-medium text-slate-900 outline-none bg-transparent p-2 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded transition-all placeholder-slate-300"
                                                             />
                                                         </td>
                                                         <td className="p-2 border-r border-slate-100 text-center font-bold text-blue-700 bg-blue-50/10">
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
                                             className="w-full py-2 border border-dashed border-slate-300 rounded-lg text-slate-400 text-xs font-bold hover:bg-white hover:border-blue-300 hover:text-blue-600 transition-all flex items-center justify-center gap-2 uppercase tracking-wide"
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
            <div className="bg-white p-6 rounded-full shadow-sm mb-4 border border-blue-50">
                <Scissors size={48} className="text-blue-200" />
            </div>
            <h3 className="text-lg font-bold text-slate-700">No Job Selected</h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2">Select a pending job from the list to start entering coil data.</p>
          </div>
        )}
      </div>

      {/* TUTORIAL / HELP MODAL */}
      {showHelp && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                   <div className="bg-emerald-600 p-6 text-white relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-8 opacity-10"><CloudLightning size={100} /></div>
                       <h3 className="font-bold text-2xl mb-1">How to Connect Bartender</h3>
                       <p className="text-emerald-100">Follow these 3 steps to automate label printing.</p>
                       <button onClick={() => setShowHelp(false)} className="absolute top-4 right-4 bg-black/20 hover:bg-black/30 p-1.5 rounded-full transition-colors">
                           <X size={20} />
                       </button>
                   </div>
                   
                   <div className="p-8 space-y-8 overflow-y-auto max-h-[60vh]">
                       {/* Step 1 */}
                       <div className="flex gap-4">
                           <div className="bg-emerald-100 text-emerald-700 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0 border border-emerald-200">1</div>
                           <div>
                               <h4 className="font-bold text-slate-800 text-lg">Create the Bridge File</h4>
                               <p className="text-slate-600 text-sm mt-1">Create a new empty CSV file on your desktop (e.g., <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono">PrintData.csv</code>).</p>
                           </div>
                       </div>

                       {/* Step 2 */}
                       <div className="flex gap-4">
                           <div className="bg-blue-100 text-blue-700 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0 border border-blue-200">2</div>
                           <div>
                               <h4 className="font-bold text-slate-800 text-lg">Connect this App</h4>
                               <p className="text-slate-600 text-sm mt-1">Click the <span className="font-bold text-slate-800 inline-flex items-center gap-1 bg-slate-100 px-1.5 rounded border border-slate-200"><Plug size={12}/> Connect DB</span> button in the toolbar above. Select the file you just created.</p>
                               <p className="text-xs text-amber-600 mt-2 bg-amber-50 p-2 rounded border border-amber-100"><strong>Note:</strong> You must use Google Chrome, Edge, or Opera on a Desktop computer.</p>
                           </div>
                       </div>

                       {/* Step 3 */}
                       <div className="flex gap-4">
                           <div className="bg-slate-100 text-slate-700 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0 border border-slate-200">3</div>
                           <div>
                               <h4 className="font-bold text-slate-800 text-lg">Configure Bartender Database</h4>
                               <p className="text-slate-600 text-sm mt-1 mb-2">Based on your screenshot, use the <strong>Database Connection Wizard</strong>:</p>
                               <ul className="text-sm space-y-2 list-disc ml-4 text-slate-600">
                                   <li><strong>Selection:</strong> Choose <span className="font-bold bg-yellow-100 px-1 rounded text-slate-900">Text File</span> (near bottom).</li>
                                   <li><strong>File Name:</strong> Browse to your CSV file.</li>
                                   <li><strong>Format:</strong> Select 'Delimited' and 'Comma'.</li>
                                   <li><strong>Tip:</strong> Do <strong>NOT</strong> select 'Microsoft Excel'. CSV is a Text File.</li>
                               </ul>
                           </div>
                       </div>
                   </div>

                   <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                       <button onClick={() => setShowHelp(false)} className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors">
                           Got it
                       </button>
                   </div>
              </div>
          </div>
      )}

      {/* PRINT SETTINGS MODAL */}
      {showPrintSettings && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                          <Settings size={18} /> Print & CSV Configuration
                      </h3>
                      <button onClick={() => setShowPrintSettings(false)} className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="p-6 overflow-y-auto max-h-[70vh]">
                      
                      <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                          <h4 className="text-xs font-bold text-blue-800 uppercase mb-3 flex items-center gap-2">
                              <FileText size={14}/> File Mode
                          </h4>
                          <label className="flex items-center gap-3 cursor-pointer">
                              <div className={`w-12 h-6 rounded-full p-1 transition-colors ${printConfig.append ? 'bg-blue-600' : 'bg-slate-300'}`} onClick={() => setPrintConfig({...printConfig, append: !printConfig.append})}>
                                  <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${printConfig.append ? 'translate-x-6' : 'translate-x-0'}`}></div>
                              </div>
                              <div>
                                  <span className="text-sm font-bold text-slate-700">Append Mode</span>
                                  <p className="text-xs text-slate-500">Add new rows to end of file (Packing List Style)</p>
                              </div>
                          </label>
                          
                          <label className="flex items-center gap-3 cursor-pointer mt-4">
                              <input 
                                  type="checkbox" 
                                  checked={printConfig.includeHeaders} 
                                  onChange={(e) => setPrintConfig({...printConfig, includeHeaders: e.target.checked})}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm font-medium text-slate-700">Include Header Row</span>
                          </label>
                      </div>

                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">CSV Column Headers (Match your Excel/Bartender)</h4>
                      <div className="grid grid-cols-2 gap-4">
                          {Object.entries(printConfig.columnNames).map(([key, value]) => (
                              <div key={key}>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{key}</label>
                                  <input 
                                      type="text" 
                                      value={value} 
                                      onChange={(e) => setPrintConfig({
                                          ...printConfig, 
                                          columnNames: { ...printConfig.columnNames, [key]: e.target.value }
                                      })}
                                      className="w-full p-2 border border-slate-200 rounded text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                  />
                              </div>
                          ))}
                      </div>
                  </div>
                  <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                      <button onClick={() => setShowPrintSettings(false)} className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors">
                          Done
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default SlittingDashboard;
