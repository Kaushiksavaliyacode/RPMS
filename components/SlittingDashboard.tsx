
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { JobCard, SlittingEntry, JobStatus } from '../types';
import { Search, Scissors, Save, ArrowLeft, Plus, Trash2, CloudLightning, Printer, CheckSquare, Square, Plug, PlugZap, Settings, X, FileText, HelpCircle, RefreshCw, Zap, Eraser, AlertTriangle, ExternalLink } from 'lucide-react';
import { openLocalFile, writeToLocalFile, isFileSystemSupported, getSavedFileHandle, verifyPermission, clearLocalFile } from '../services/fileSystem';

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

// --- BACKUP WEB LABEL VIEW ---
const LabelPrintView = ({ labels }: { labels: any[] }) => {
    return (
        <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-0 m-0">
            {labels.map((label, index) => (
                <div key={index} className="label-page border-2 border-black">
                    <div className="flex justify-between items-start border-b-2 border-black pb-1 mb-1">
                        <h1 className="text-xl font-black uppercase tracking-tight truncate w-2/3">{label.party}</h1>
                        <div className="text-right">
                             <span className="block text-[10px] font-bold uppercase">Job No</span>
                             <span className="block text-lg font-black leading-none">{label.jobNo}</span>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1">
                         <div className="border border-black p-1">
                             <span className="text-[9px] font-bold uppercase block">Size</span>
                             <span className="text-xl font-black">{label.size} <span className="text-sm">mm</span></span>
                         </div>
                         <div className="border border-black p-1">
                             <span className="text-[9px] font-bold uppercase block">Micron</span>
                             <span className="text-xl font-black">{label.micron} <span className="text-sm">µ</span></span>
                         </div>
                         <div className="border border-black p-1">
                             <span className="text-[9px] font-bold uppercase block">Gross Wt</span>
                             <span className="text-xl font-black">{label.gross} <span className="text-sm">kg</span></span>
                         </div>
                         <div className="border border-black p-1">
                             <span className="text-[9px] font-bold uppercase block">Net Wt</span>
                             <span className="text-xl font-black">{label.net} <span className="text-sm">kg</span></span>
                         </div>
                    </div>

                    <div className="flex justify-between items-end mt-2">
                        <div className="text-[10px] font-bold">{label.date}</div>
                        <div className="text-right">
                            <span className="text-[10px] font-bold uppercase block">Roll No</span>
                            <span className="text-2xl font-black leading-none">{label.srNo}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

const SlittingDashboard: React.FC<SlittingDashboardProps> = ({ jobs, onUpdateJob }) => {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  const [isSaving, setIsSaving] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState('');
  
  // Label Printing Selection State
  const [selectedForPrint, setSelectedForPrint] = useState<Set<string>>(new Set());
  
  // Print Settings State
  const [showPrintSettings, setShowPrintSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  // App Config State
  const [appConfig, setAppConfig] = useState({
      append: false, // Default to false for BarTender stability
      includeHeaders: true,
      autoSync: false, 
      columnNames: {
          srNo: 'Roll No.',
          date: 'Date',
          size: 'Size',
          meter: 'Meter',
          micron: 'Micron',
          gross: 'Gross Wt.',
          core: 'Core Wt',
          net: 'Net Wt',
          party: 'Party Name'
      }
  });

  // Local File Handle State
  const [fileHandle, setFileHandle] = useState<any>(null);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);

  // Separate grid data for each coil
  const [coilGrids, setCoilGrids] = useState<CoilGridState>({});
  
  // Refs
  const isTypingRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  // 1. Restore Persistent File Handle on Mount
  useEffect(() => {
    const restoreHandle = async () => {
        try {
            const savedHandle = await getSavedFileHandle();
            if (savedHandle) {
                setFileHandle(savedHandle);
                // We cannot check permission silently without user gesture in some browsers,
                // but we know we have a handle. We wait for user interaction to verify.
                setIsPermissionGranted(false); 
            }
        } catch (e) {
            console.error("Failed to restore handle", e);
        }
    };
    restoreHandle();
  }, []);

  // 2. Load Grid Data when Job Selected
  useEffect(() => {
    if (selectedJob && !isTypingRef.current) {
      const newGrids: CoilGridState = {};

      selectedJob.coils.forEach(coil => {
        const coilData = selectedJob.slittingData
          .filter(d => d.coilId === coil.id)
          .sort((a, b) => Number(a.srNo) - Number(b.srNo));

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
      setSelectedForPrint(new Set()); 
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

  // --- GENERATE DATA HELPERS ---
  const generateCSV = (grids: CoilGridState, specificIds?: Set<string>) => {
      if (!selectedJob) return "";
      const cols = appConfig.columnNames;
      let csvContent = "";
      
      if (appConfig.includeHeaders) {
          csvContent += `${cols.srNo},${cols.date},${cols.size},${cols.meter},${cols.micron},${cols.gross},${cols.core},${cols.net},${cols.party}\r\n`;
      }

      Object.entries(grids).forEach(([coilId, rows]) => {
          const coilDef = selectedJob.coils.find(c => c.id === coilId);
          if (!coilDef) return;

          (rows as GridRow[]).forEach(row => {
              const compositeId = `${coilId}_${row.id}`;
              const shouldInclude = specificIds ? specificIds.has(compositeId) : (row.gross && row.gross !== '0');

              if (shouldInclude) {
                  const gross = parseFloat(row.gross) || 0;
                  const core = parseFloat(row.core) || 0;
                  const net = gross - core;
                  
                  let meter = 0;
                  if (selectedJob.micron > 0 && coilDef.size > 0) {
                     meter = (net / selectedJob.micron / 0.00139 / coilDef.size) * 1000;
                  }
                  
                  let dateStr = new Date().toLocaleDateString();
                  if (selectedJob.slittingData) {
                      const saved = selectedJob.slittingData.find(d => d.id === row.id);
                      if (saved) dateStr = saved.timestamp.split(',')[0];
                  }

                  const partyName = selectedJob.jobCode; // Using Job Code as Party Name per user request

                  const csvRow = `${row.srNo},"${dateStr}",${coilDef.size},${meter.toFixed(0)},${selectedJob.micron},${gross.toFixed(3)},${core.toFixed(3)},${net.toFixed(3)},"${partyName}"`;
                  csvContent += csvRow + "\r\n";
              }
          });
      });
      return csvContent;
  };

  const getLabelsForWebPrint = () => {
      if (!selectedJob) return [];
      const labels: any[] = [];
      
      Object.entries(coilGrids).forEach(([coilId, rows]) => {
          const coilDef = selectedJob.coils.find(c => c.id === coilId);
          if (!coilDef) return;

          (rows as GridRow[]).forEach(row => {
               const compositeId = `${coilId}_${row.id}`;
               if (selectedForPrint.has(compositeId)) {
                   const gross = parseFloat(row.gross) || 0;
                   const core = parseFloat(row.core) || 0;
                   const net = gross - core;
                   
                   labels.push({
                       party: selectedJob.jobCode,
                       jobNo: selectedJob.srNo,
                       size: coilDef.size,
                       micron: selectedJob.micron,
                       gross: gross.toFixed(3),
                       net: net.toFixed(3),
                       srNo: row.srNo,
                       date: new Date().toLocaleDateString()
                   });
               }
          });
      });
      return labels;
  };

  // --- ACTIONS ---

  const handleWebPrint = () => {
      if (selectedForPrint.size === 0) {
          alert("Please select rolls to print.");
          return;
      }
      window.print();
  }

  const syncToLocalFile = async (grids: CoilGridState) => {
      if (!fileHandle || !appConfig.autoSync) return;
      try {
          const content = generateCSV(grids);
          if (isPermissionGranted) {
               await writeToLocalFile(fileHandle, content, false);
          }
      } catch (e) {
          console.warn("Auto-sync failed", e);
      }
  };

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
        
        if (appConfig.autoSync) {
            syncToLocalFile(newGrids);
        }
        
        setIsSaving(false);
        isTypingRef.current = false;
    }, 1500);
  }, [selectedJob, onUpdateJob, appConfig.autoSync, fileHandle, isPermissionGranted]);

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

  const handleConnectFile = async () => {
    try {
      if (fileHandle && !isPermissionGranted) {
          const permitted = await verifyPermission(fileHandle, true);
          if (permitted) {
              setIsPermissionGranted(true);
              alert("Connection Verified!");
              return;
          }
      }
      const handle = await openLocalFile();
      setFileHandle(handle);
      setIsPermissionGranted(true);
      alert("Successfully connected to local database file.");
    } catch (error) {
      console.error("File connection failed:", error);
      alert("Connection failed. Please try again.");
    }
  };

  const handleClearFile = async () => {
      if (!fileHandle) return;
      if (!confirm("Are you sure? This will delete ALL content in your CSV file.")) return;
      try {
          await clearLocalFile(fileHandle);
          alert("File cleared successfully.");
      } catch (e) {
          console.error("Clear failed", e);
          alert("Failed to clear file. Check permission.");
      }
  };

  const handlePrintLabels = async () => {
      if (!selectedJob || selectedForPrint.size === 0) {
          alert("Please select rows to print first.");
          return;
      }

      const csvContent = generateCSV(coilGrids, selectedForPrint);
      if (!csvContent) return;

      if (fileHandle) {
          try {
             await writeToLocalFile(fileHandle, csvContent, appConfig.append);
             alert(`Data written to packing.csv`);
          } catch (e: any) {
             console.error("Write failed", e);
             if (e.name === 'NotAllowedError') {
                 alert("Permission needed. Click 'Verify Connection' button.");
                 setIsPermissionGranted(false);
             } else if (e.message && e.message.includes("lock")) {
                 alert("FILE LOCKED: Please close packing.csv in Excel!");
             } else {
                 alert("Write failed. Please close the file in Excel and try again.");
             }
          }
      } else {
          // Fallback Download
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement("a");
          const url = URL.createObjectURL(blob);
          link.setAttribute("href", url);
          link.setAttribute("download", `packing.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      }
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
      const validRows = rows.filter(r => r.gross && r.gross !== '0');
      
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
       
       <LabelPrintView labels={getLabelsForWebPrint()} />

       {/* Sidebar */}
       <div className={`w-full lg:w-80 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden shrink-0 h-full lg:flex ${mobileView === 'detail' ? 'hidden' : 'flex'} no-print`}>
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
      <div className={`flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden relative ${mobileView === 'list' ? 'hidden' : 'flex'} no-print`}>
        {selectedJob ? (
          <>
             {/* HEADER */}
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
                    <div className="flex items-center gap-2 sm:gap-4 w-full xl:w-auto border-t border-blue-100 xl:border-t-0 pt-4 xl:pt-0 justify-end flex-wrap">
                        
                        <button 
                             onClick={() => setShowPrintSettings(true)}
                             className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                             title="Settings"
                        >
                            <Settings size={20} />
                        </button>

                        <button
                             onClick={() => setShowHelp(true)}
                             className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                             title="Help"
                        >
                            <HelpCircle size={20} />
                        </button>

                        {/* DB CONNECT BUTTON - Global State */}
                        {isFileSystemSupported() && (
                            <button
                                onClick={handleConnectFile}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all border ${
                                    fileHandle 
                                        ? (isPermissionGranted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse') 
                                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                {fileHandle && isPermissionGranted ? <PlugZap size={14} className="text-emerald-500" /> : <Plug size={14} />}
                                {fileHandle 
                                    ? (isPermissionGranted ? "DB Connected" : "Verify Connection") 
                                    : "Connect DB"}
                            </button>
                        )}
                        
                        {/* Backup Web Print */}
                        {selectedForPrint.size > 0 && (
                            <button
                                onClick={handleWebPrint}
                                className="flex items-center gap-2 bg-white text-slate-700 border border-slate-300 px-4 py-2 rounded-lg font-bold hover:bg-slate-50 transition-all uppercase text-xs tracking-wider"
                            >
                                <ExternalLink size={14} />
                                Quick Print (Web)
                            </button>
                        )}

                        {selectedForPrint.size > 0 && (
                            <button
                                onClick={handlePrintLabels}
                                className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg font-bold shadow-md hover:bg-slate-900 transition-all uppercase text-xs tracking-wider"
                            >
                                <Printer size={14} />
                                Save & Print ({selectedForPrint.size})
                            </button>
                        )}

                        <button 
                            onClick={handleManualSave} 
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 text-xs uppercase tracking-wide"
                        >
                            <Save size={14} />
                            <span>Save</span>
                        </button>

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

             {/* SCROLLABLE CONTENT */}
             <div className="flex-1 overflow-y-auto bg-slate-50 p-2 sm:p-4">
                 <div className={`grid grid-cols-1 ${selectedJob.coils.length > 1 ? 'xl:grid-cols-2' : ''} gap-4`}>
                     
                     {selectedJob.coils.map((coil, index) => {
                         const rows = coilGrids[coil.id] || [];
                         const coilTotal = rows.reduce((acc, row) => acc + calculateLiveNet(row.gross, row.core), 0);
                         
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

                                 {/* Table */}
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

      {/* TUTORIAL MODAL */}
      {showHelp && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                   <div className="bg-emerald-600 p-6 text-white relative shrink-0">
                       <h3 className="font-bold text-2xl mb-1">BarTender Connection Guide</h3>
                       <p className="text-emerald-100 text-sm">Follow these steps to enable auto-printing.</p>
                       <button onClick={() => setShowHelp(false)} className="absolute top-4 right-4 bg-black/20 hover:bg-black/30 p-1.5 rounded-full transition-colors">
                           <X size={20} />
                       </button>
                   </div>
                   <div className="p-8 overflow-y-auto">
                       
                       <div className="space-y-8">
                           {/* Step 1 */}
                           <div className="flex gap-4">
                               <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0">1</div>
                               <div>
                                   <h4 className="font-bold text-slate-800 mb-2">Connect App to CSV</h4>
                                   <p className="text-sm text-slate-600 mb-2">
                                       Click the <span className="font-bold text-slate-800">Connect DB</span> button above and select your <code className="bg-slate-100 px-1 rounded">packing.csv</code> file.
                                   </p>
                                   <p className="text-xs text-slate-500 italic">This allows the web app to write data directly to your computer.</p>
                               </div>
                           </div>

                           {/* Step 2 */}
                           <div className="flex gap-4">
                               <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0">2</div>
                               <div>
                                   <h4 className="font-bold text-slate-800 mb-2">Configure BarTender Label</h4>
                                   <ul className="text-sm text-slate-600 list-disc pl-4 space-y-1">
                                       <li>Open your label in BarTender Designer.</li>
                                       <li>Go to <strong>File &gt; Database Connection Setup</strong>.</li>
                                       <li>Select <strong>Text File</strong> (Do NOT select Excel).</li>
                                       <li>Point to the same <code className="bg-slate-100 px-1 rounded">packing.csv</code> file.</li>
                                       <li>Finish the wizard and drag fields onto your label.</li>
                                   </ul>
                               </div>
                           </div>

                           {/* Troubleshooting */}
                           <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                               <h4 className="font-bold text-amber-800 mb-2 flex items-center gap-2"><AlertTriangle size={18}/> Troubleshooting: "Data Saves but Labels Don't Print"</h4>
                               <ul className="text-sm text-amber-700 list-disc pl-4 space-y-2">
                                   <li><strong>Check Integration Service:</strong> Open <em>BarTender Administration Console</em>. Go to "Windows Services" tab. Ensure the "BarTender Integration Service" is <span className="font-bold text-green-600 bg-white px-1 rounded">Running</span>.</li>
                                   <li><strong>Check Integration State:</strong> Open <em>Integration Builder</em>. Make sure your specific integration is started (Green Play button).</li>
                                   <li><strong>Check Errors:</strong> Look at the "History" tab in Integration Builder. It will tell you if it tried to print and failed (e.g., "Printer not found" or "Database locked").</li>
                                   <li><strong>Web Backup:</strong> If BarTender fails, use the <span className="font-bold">Quick Print (Web)</span> button to print directly from this browser as an emergency backup.</li>
                               </ul>
                           </div>
                       </div>

                   </div>
              </div>
          </div>
      )}

      {/* SETTINGS MODAL */}
      {showPrintSettings && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                          <Settings size={18} /> Configuration
                      </h3>
                      <button onClick={() => setShowPrintSettings(false)} className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="p-6 overflow-y-auto max-h-[70vh]">
                      
                      {/* Live Sync Option */}
                      <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                          <h4 className="text-xs font-bold text-emerald-800 uppercase mb-3 flex items-center gap-2">
                              <Zap size={14} fill="currentColor"/> Live Sync
                          </h4>
                          <label className="flex items-center gap-3 cursor-pointer">
                              <div className={`w-12 h-6 rounded-full p-1 transition-colors ${appConfig.autoSync ? 'bg-emerald-600' : 'bg-slate-300'}`} onClick={() => setAppConfig({...appConfig, autoSync: !appConfig.autoSync})}>
                                  <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${appConfig.autoSync ? 'translate-x-6' : 'translate-x-0'}`}></div>
                              </div>
                              <div>
                                  <span className="text-sm font-bold text-slate-700">Auto-Update Excel</span>
                                  <p className="text-xs text-slate-500">Updates file immediately while typing. (Overwrites file)</p>
                              </div>
                          </label>
                      </div>

                      <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                          <h4 className="text-xs font-bold text-blue-800 uppercase mb-3 flex items-center gap-2">
                              <FileText size={14}/> File Mode
                          </h4>
                          <label className="flex items-center gap-3 cursor-pointer">
                              <div className={`w-12 h-6 rounded-full p-1 transition-colors ${appConfig.append ? 'bg-blue-600' : 'bg-slate-300'}`} onClick={() => setAppConfig({...appConfig, append: !appConfig.append})}>
                                  <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${appConfig.append ? 'translate-x-6' : 'translate-x-0'}`}></div>
                              </div>
                              <div>
                                  <span className="text-sm font-bold text-slate-700">Append Mode</span>
                                  <p className="text-xs text-slate-500">Add to end of file (For History/Packing Lists)</p>
                              </div>
                          </label>
                          <p className="text-[10px] text-slate-500 mt-2 italic bg-white/50 p-2 rounded border border-blue-100">
                             <strong>Recommendation:</strong> Turn OFF for BarTender Automation so it only prints new labels.
                          </p>
                      </div>
                      
                      {/* Clear File Option */}
                      <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl">
                          <h4 className="text-xs font-bold text-red-800 uppercase mb-3 flex items-center gap-2">
                              <AlertTriangle size={14}/> Danger Zone
                          </h4>
                           <button 
                              onClick={handleClearFile}
                              className="w-full bg-white border border-red-200 text-red-600 hover:bg-red-600 hover:text-white px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2"
                          >
                              <Eraser size={14} /> Clear File Content
                          </button>
                          <p className="text-[10px] text-red-400 mt-2 text-center">Use this if your file has empty rows or corruption.</p>
                      </div>

                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">CSV Headers</h4>
                      <div className="grid grid-cols-2 gap-4">
                          {Object.entries(appConfig.columnNames).map(([key, value]) => (
                              <div key={key}>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{key}</label>
                                  <input 
                                      type="text" 
                                      value={value} 
                                      onChange={(e) => setAppConfig({
                                          ...appConfig, 
                                          columnNames: { ...appConfig.columnNames, [key]: e.target.value }
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
