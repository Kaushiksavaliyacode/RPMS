export type Department = 'ADMIN' | 'PRODUCTION' | 'SLITTING';

export interface ProductionEntry {
  id: string;
  grossWeight: number;
  coreWeight: number;
  netWeight: number;
  meter: number; // Added manual meter field
  joints: number;
  timestamp: string;
}

export interface SlittingEntry {
  id: string;
  coilId: string; // Identifies which coil (1, 2, 3, 4) this belongs to
  srNo: string;
  meter: number;
  grossWeight: number;
  coreWeight: number;
  netWeight: number;
  timestamp: string;
}

export interface CoilDefinition {
  id: string;
  label: string; // e.g., "Coil 1"
  size: number; // mm
}

export interface JobCard {
  id: string;
  srNo: string;
  jobCode: string;
  size: number; // Total width mm
  totalQuantity: number;
  micron: number;
  perRollMeter: number;
  date: string;
  note: string;
  coils: CoilDefinition[]; // Max 4 coils
  status: 'Pending' | 'Running' | 'Completed';
  productionData: ProductionEntry[];
  slittingData: SlittingEntry[];
  createdAt: number;
}

export interface User {
  role: Department;
  isAuthenticated: boolean;
}