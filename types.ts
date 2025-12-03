
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
  totalRolls: number;
}

export interface JobCard {
  id: string;
  srNo: string;
  jobCode: string;
  partyName?: string; // Added Party Name
  size: number; 
  totalQuantity: number;
  micron: number;
  perRollMeter: number;
  date: string;
  note: string;
  coils: CoilDefinition[]; 
  
  // Statuses
  status: JobStatus;
  productionStatus: JobStatus;
  slittingStatus: JobStatus;

  // Timestamps
  productionStartTime?: number;
  productionEndTime?: number;

  productionData: ProductionEntry[];
  slittingData: SlittingEntry[];
  createdAt: number;
}

export interface User {
  role: Department;
  isAuthenticated: boolean;
}

export interface AppSettings {
    append: boolean;
    includeHeaders: boolean;
    autoSync: boolean;
    googleSheetUrl?: string; // Added Google Sheet URL
    columnNames: {
        srNo: string;
        date: string;
        size: string;
        meter: string;
        micron: string;
        gross: string;
        core: string;
        net: string;
        party: string;
    }
}

export interface PrintJob {
    id: string;
    timestamp: number;
    sender: string;
    labels: any[]; // Array of label data
}