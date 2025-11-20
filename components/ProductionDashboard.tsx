
import React, { useState, useEffect, useRef } from 'react';
import { JobCard, ProductionEntry } from '../types';
import { Search, PlayCircle, Activity, CheckCircle, Save, Trash2, ArrowLeft, Plus, RotateCcw } from 'lucide-react';

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
  
  // Excel-like Grid State
  // We combine existing saved data + 5 new empty rows for editing
  const [gridData, setGridData] = useState<any[]>([]);
  
  const selectedJob = jobs.find(j => j.id === selectedJobId);

  useEffect(() => {
    if (selectedJob) {
      // Load existing data and add 5 empty rows at the bottom
      const existing = selectedJob.productionData.map(d => ({
        ...d,
        grossWeight: d.grossWeight.toString(),
        coreWeight: d.coreWeight.toString(),
        meter: d.meter ? d.meter.toString() : '',
        joints: d.joints.toString(),
        isNew: false
      }));
      setGridData([...existing, ...generateEmptyRows(5)]);
    } else {
      setGridData([]);
    }
  }, [selectedJob]);

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

  // Handle Cell Change
  const handleCellChange = (id: string, field: string, value: string) => {
    setGridData(prev => prev.map(row => {
      if (row.id === id) {
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  // Save Function
  const handleSave = () => {
    if (!selectedJob) return;

    // Filter out completely empty new rows
    const validRows = gridData.filter(row => {
        if (!row.isNew) return true; // Keep existing rows even if cleared (or handle delete separately)
        return row.grossWeight !== '' || row.coreWeight !== '' || row.meter !== '';
    });

    const newProductionData: ProductionEntry[] = validRows.map(row => {
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

    // Sort by timestamp (newest on top usually, but for excel we might keep order)
    // For now, we just save the array as is.
    onUpdateJob({ ...selectedJob, productionData: newProductionData });
    alert("Data Saved Successfully!");
    
    // Re-init with 5 fresh rows at bottom if needed, but useEffect handles sync
  };

  const addMoreRows = () => {
      setGridData(prev => [...prev, ...generateEmptyRows(5)]);
  }

  const handleDeleteRow = (id: string) => {
      if(confirm("Delete this row?")) {
        setGridData(prev => prev.filter(r => r.id !== id));
      }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100dvh-5rem)] relative bg-slate-50">
      {/* Job List Sidebar */}
      <div className={`w-full lg:w-1/4 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-full lg:flex ${mobileView === 'detail' ? 'hidden' : 'flex'}`}>
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-bold text-slate-800 mb-2">Production Jobs</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {jobs.map(job => (
            <div
              key={job.id}
              onClick={() => handleJobSelect(job.id)}
              className={`p-3 rounded-lg cursor-pointer border transition-all ${
                selectedJobId === job.id
                  ? 'bg-indigo-50 border-indigo-500 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-indigo-300'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-800">#{job.srNo}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${
                      job.status === 'Running' ? 'bg-amber-100 text-amber-700' : 
                      job.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>{job.status}</span>
              </div>
              <p className="text-xs text-slate-500 truncate">{job.jobCode}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid Area */}
      <div className={`w-full lg:w-3/4 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden relative lg:flex ${mobileView === 'list' ? 'hidden' : 'flex'}`}>
        {selectedJob ? (
          <>
            {/* Header */}
            <div className="p-3 border-b border-slate-200 bg-white flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
               <div className="flex items-center gap-3 w-full sm:w-auto">
                   <button onClick={() => setMobileView('list')} className="lg:hidden p-2 bg-slate-100 rounded-lg">
                       <ArrowLeft size={18} />
                   </button>
                   <div>
                       <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                           #{selectedJob.srNo} <span className="text-sm font-medium text-slate-500">({selectedJob.jobCode})</span>
                       </h2>
                       <div className="flex gap-4 text-xs text-slate-500">
                           <span>Size: <b>{selectedJob.size}mm</b></span>
                           <span>Micron: <b>{selectedJob.micron}µ</b></span>
                           <span>Target: <b>{selectedJob.totalQuantity}kg</b></span>
                       </div>
                   </div>
               </div>
               
               <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="flex bg-slate-100 p-1 rounded-lg mr-2">
                        {(['Pending', 'Running', 'Completed'] as const).map((s) => (
                            <button
                                key={s}
                                onClick={() => handleStatusChange(selectedJob.id, s)}
                                className={`px-3 py-1 text-xs font-bold rounded transition-all ${
                                    selectedJob.status === s
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-400'
                                }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                   <button onClick={handleSave} className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20">
                       <Save size={16} /> Save Data
                   </button>
               </div>
            </div>

            {/* Excel Grid Container */}
            <div className="flex-1 overflow-auto bg-slate-50 relative">
                <div className="min-w-[800px]">
                    {/* Grid Header */}
                    <div className="grid grid-cols-12 gap-0 sticky top-0 z-10 shadow-sm text-xs uppercase font-bold text-slate-500 bg-slate-100 border-b border-slate-300">
                        <div className="col-span-1 p-3 text-center border-r border-slate-300">#</div>
                        <div className="col-span-3 p-3 border-r border-slate-300 bg-white">Gross Weight (kg)</div>
                        <div className="col-span-2 p-3 border-r border-slate-300 bg-white">Core Weight (kg)</div>
                        <div className="col-span-2 p-3 border-r border-slate-300 bg-indigo-50 text-indigo-700">Net Weight (kg)</div>
                        <div className="col-span-2 p-3 border-r border-slate-300 bg-white">Meter</div>
                        <div className="col-span-1 p-3 border-r border-slate-300 bg-white">Joints</div>
                        <div className="col-span-1 p-3 text-center">Action</div>
                    </div>

                    {/* Grid Rows */}
                    <div className="bg-white">
                        {gridData.map((row, index) => {
                             const gross = parseFloat(row.grossWeight) || 0;
                             const core = parseFloat(row.coreWeight) || 0;
                             const net = gross - core;
                             const netClass = net > 0 ? 'text-indigo-700 font-bold' : 'text-slate-300';

                             return (
                                <div key={row.id} className="grid grid-cols-12 gap-0 border-b border-slate-200 hover:bg-blue-50/30 transition-colors group">
                                    <div className="col-span-1 p-2 text-center text-slate-400 text-xs flex items-center justify-center border-r border-slate-100 bg-slate-50">
                                        {index + 1}
                                    </div>
                                    <div className="col-span-3 border-r border-slate-100 relative">
                                        <input 
                                            type="number" step="0.001"
                                            value={row.grossWeight}
                                            onChange={(e) => handleCellChange(row.id, 'grossWeight', e.target.value)}
                                            className="w-full h-full p-2 outline-none text-sm font-medium text-slate-900 bg-transparent focus:bg-white focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                                            placeholder="0.000"
                                        />
                                    </div>
                                    <div className="col-span-2 border-r border-slate-100 relative">
                                        <input 
                                            type="number" step="0.001"
                                            value={row.coreWeight}
                                            onChange={(e) => handleCellChange(row.id, 'coreWeight', e.target.value)}
                                            className="w-full h-full p-2 outline-none text-sm font-medium text-slate-900 bg-transparent focus:bg-white focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                                            placeholder="0.000"
                                        />
                                    </div>
                                    <div className={`col-span-2 border-r border-slate-100 bg-indigo-50/10 p-2 flex items-center text-sm font-mono ${netClass}`}>
                                        {net > 0 ? net.toFixed(3) : '-'}
                                    </div>
                                    <div className="col-span-2 border-r border-slate-100 relative">
                                        <input 
                                            type="number"
                                            value={row.meter}
                                            onChange={(e) => handleCellChange(row.id, 'meter', e.target.value)}
                                            className="w-full h-full p-2 outline-none text-sm font-medium text-slate-900 bg-transparent focus:bg-white focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="col-span-1 border-r border-slate-100 relative">
                                        <input 
                                            type="number"
                                            value={row.joints}
                                            onChange={(e) => handleCellChange(row.id, 'joints', e.target.value)}
                                            className="w-full h-full p-2 outline-none text-sm font-medium text-slate-900 bg-transparent focus:bg-white focus:ring-2 focus:ring-inset focus:ring-indigo-500 text-center"
                                            placeholder="-"
                                        />
                                    </div>
                                    <div className="col-span-1 flex items-center justify-center">
                                        {!row.isNew && (
                                            <button onClick={() => handleDeleteRow(row.id)} className="p-1.5 text-slate-300 hover:text-red-500 rounded-full hover:bg-red-50">
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                             );
                        })}
                    </div>
                    
                    {/* Add Row Button */}
                    <div className="p-4">
                         <button onClick={addMoreRows} className="flex items-center gap-2 text-indigo-600 text-sm font-bold hover:bg-indigo-50 px-4 py-2 rounded-lg transition-colors">
                             <Plus size={16} /> Add 5 More Rows
                         </button>
                    </div>
                </div>
            </div>

            {/* Footer Summary */}
            <div className="bg-white border-t border-slate-200 p-3 flex flex-wrap gap-4 justify-end items-center text-sm font-medium text-slate-600 shadow-lg z-20">
                 <div className="bg-slate-100 px-3 py-1 rounded">Total Rows: <span className="text-slate-900">{selectedJob.productionData.length}</span></div>
                 <div className="bg-indigo-50 px-3 py-1 rounded text-indigo-700 border border-indigo-100">
                     Total Net Wt: <span className="font-bold text-lg ml-1">{selectedJob.productionData.reduce((a,c) => a + c.netWeight, 0).toFixed(3)} kg</span>
                 </div>
            </div>

          </>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 bg-slate-50">
            <div className="text-center">
                <PlayCircle size={48} className="mx-auto mb-2 opacity-20" />
                <p>Select a job to start data entry</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductionDashboard;
