
export type Department = 'ADMIN' | 'PRODUCTION' | 'SLITTING';

export type JobStatus = 'Pending' | 'Running' | 'Completed';

export interface ProductionEntry {
  id: string;
  grossWeight: number;
  coreWeight: number;
  netWeight: number;
  meter: number; 
  joints: number;
  timestamp: string;
}

export interface SlittingEntry {
  id: string;
  coilId: string; 
  srNo: string;
  meter: number;
  grossWeight: number;
  coreWeight: number;
  netWeight: number;
  timestamp: string;
}

export interface CoilDefinition {
  id: string;
  size: number;
  totalRolls: number; // Target rolls count
}

export interface JobCard {
  id: string;
  srNo: string;
  jobCode: string;
  size: number; 
  totalQuantity: number;
  micron: number;
  perRollMeter: number;
  date: string;
  note: string;
  coils: CoilDefinition[]; 
  
  // Overall status (Derived)
  status: JobStatus;
  
  // Department specific statuses
  productionStatus: JobStatus;
  slittingStatus: JobStatus;

  productionData: ProductionEntry[];
  slittingData: SlittingEntry[];
  createdAt: number;
}

export interface User {
  role: Department;
  isAuthenticated: boolean;
}
