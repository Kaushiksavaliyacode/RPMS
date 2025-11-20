
import React, { useState } from 'react';
import { JobCard, CoilDefinition } from '../types';
import { Plus, Trash2, X, Save, Layers } from 'lucide-react';

interface JobCardFormProps {
  onClose: () => void;
  onSubmit: (job: JobCard) => void;
}

const JobCardForm: React.FC<JobCardFormProps> = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    srNo: '',
    jobCode: '',
    size: '',
    totalQuantity: '',
    micron: '',
    perRollMeter: '',
    date: new Date().toISOString().split('T')[0],
    note: '',
  });

  const [coils, setCoils] = useState<CoilDefinition[]>([
    { id: 'coil-1', size: 0, totalRolls: 0 },
    { id: 'coil-2', size: 0, totalRolls: 0 },
  ]);

  const handleAddCoil = () => {
    if (coils.length >= 4) return;
    const nextNum = coils.length + 1;
    setCoils([...coils, { id: `coil-${nextNum}`, size: 0, totalRolls: 0 }]);
  };

  const handleRemoveCoil = () => {
    if (coils.length <= 1) return;
    setCoils(coils.slice(0, -1));
  };

  const handleCoilChange = (id: string, field: keyof CoilDefinition, value: string) => {
    setCoils(coils.map(c => c.id === id ? { ...c, [field]: Number(value) } : c));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newJob: JobCard = {
      id: crypto.randomUUID(),
      srNo: formData.srNo,
      jobCode: formData.jobCode,
      size: Number(formData.size),
      totalQuantity: Number(formData.totalQuantity),
      micron: Number(formData.micron),
      perRollMeter: Number(formData.perRollMeter),
      date: formData.date,
      note: formData.note,
      coils: coils,
      status: 'Pending', // Overall Status
      productionStatus: 'Pending',
      slittingStatus: 'Pending',
      productionData: [],
      slittingData: [],
      createdAt: Date.now(),
    };
    onSubmit(newJob);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] sm:h-auto sm:max-h-[90vh] overflow-y-auto border border-slate-100 flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 sticky top-0 bg-white z-10 shrink-0">
          <div className="flex items-center gap-3">
             <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                <Layers size={24} />
             </div>
             <div>
                <h2 className="text-xl font-bold text-slate-800">Create New Job Card</h2>
                <p className="text-xs text-slate-500">Enter production details below</p>
             </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-2 rounded-full transition-all">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="md:col-span-3 bg-slate-50 p-4 rounded-xl border border-slate-100 mb-2">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">General Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">Date</label>
                    <input
                        required
                        type="date"
                        value={formData.date}
                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                        className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                    </div>
                    <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">Sr. No (Job Number) *</label>
                    <input
                        required
                        type="text"
                        placeholder="e.g. 1001"
                        value={formData.srNo}
                        onChange={e => setFormData({ ...formData, srNo: e.target.value })}
                        className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                    />
                    </div>
                    <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">Job Code *</label>
                    <input
                        required
                        type="text"
                        placeholder="e.g. REL-A-001"
                        value={formData.jobCode}
                        onChange={e => setFormData({ ...formData, jobCode: e.target.value })}
                        className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                    />
                    </div>
                </div>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">Size (mm) *</label>
              <input
                required
                type="number"
                placeholder="Total Width"
                value={formData.size}
                onChange={e => setFormData({ ...formData, size: e.target.value })}
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">Micron (µm) *</label>
              <input
                required
                type="number"
                placeholder="Thickness"
                value={formData.micron}
                onChange={e => setFormData({ ...formData, micron: e.target.value })}
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">Total Quantity (kg)</label>
              <input
                required
                type="number"
                placeholder="Target Weight"
                value={formData.totalQuantity}
                onChange={e => setFormData({ ...formData, totalQuantity: e.target.value })}
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">Per Roll Meter</label>
              <input
                required
                type="number"
                placeholder="Meters per roll"
                value={formData.perRollMeter}
                onChange={e => setFormData({ ...formData, perRollMeter: e.target.value })}
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            
             <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">Additional Note</label>
                <input
                    type="text"
                    placeholder="Any special instructions..."
                    value={formData.note}
                    onChange={e => setFormData({ ...formData, note: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Slitting Coil Configuration</h3>
              <div className="flex gap-2">
                {coils.length > 1 && (
                    <button
                    type="button"
                    onClick={handleRemoveCoil}
                    className="flex items-center space-x-1 px-3 py-1.5 text-xs bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium transition-colors"
                    >
                    <Trash2 size={14} /> <span className="hidden sm:inline">Remove Last</span>
                    </button>
                )}
                {coils.length < 4 && (
                    <button
                    type="button"
                    onClick={handleAddCoil}
                    className="flex items-center space-x-1 px-3 py-1.5 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-medium transition-colors"
                    >
                    <Plus size={14} /> <span className="hidden sm:inline">Add Coil</span>
                    </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {coils.map((coil, index) => (
                <div key={coil.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100 relative group">
                  <div className="absolute -top-2 -left-2 w-6 h-6 bg-slate-800 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                    {index + 1}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5 text-center">Size (mm)</label>
                        <input
                            required
                            type="number"
                            value={coil.size || ''}
                            onChange={e => handleCoilChange(coil.id, 'size', e.target.value)}
                            className="w-full p-2 text-center text-lg font-bold text-slate-800 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5 text-center">Total Rolls</label>
                        <input
                            required
                            type="number"
                            value={coil.totalRolls || ''}
                            onChange={e => handleCoilChange(coil.id, 'totalRolls', e.target.value)}
                            className="w-full p-2 text-center text-lg font-bold text-slate-800 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            placeholder="0"
                        />
                      </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end space-y-reverse space-y-3 sm:space-y-0 sm:space-x-3 pt-8 border-t border-slate-100 mt-8 shrink-0 pb-6 sm:pb-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-3 sm:py-2.5 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-3 sm:py-2.5 text-white bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5"
            >
              <Save size={18} />
              <span>Create Job Card</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JobCardForm;
