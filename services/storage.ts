
import { JobCard } from '../types';

const STORAGE_KEY = 'reliance-pms-jobs';

// --- Helper to get jobs ---
const getLocalJobs = (): JobCard[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Error parsing jobs from local storage", e);
    return [];
  }
};

// --- Helper to save jobs ---
const saveLocalJobs = (jobs: JobCard[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  // Dispatch event for other components in same tab
  window.dispatchEvent(new Event('local-storage-update'));
};

// --- Real-time Listener (Cross-tab & Local) ---
export const subscribeToJobs = (onDataChange: (jobs: JobCard[]) => void) => {
  // Initial load
  onDataChange(getLocalJobs());

  // Listener for changes in other tabs (Browser native event)
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      onDataChange(getLocalJobs());
    }
  };

  // Listener for changes in current tab (Custom event)
  const handleLocalUpdate = () => {
    onDataChange(getLocalJobs());
  };

  window.addEventListener('storage', handleStorageChange);
  window.addEventListener('local-storage-update', handleLocalUpdate);

  return () => {
    window.removeEventListener('storage', handleStorageChange);
    window.removeEventListener('local-storage-update', handleLocalUpdate);
  };
};

// --- CRUD Operations ---

export const addJob = async (job: JobCard) => {
  const jobs = getLocalJobs();
  if (jobs.find(j => j.id === job.id)) return;
  const newJobs = [job, ...jobs];
  saveLocalJobs(newJobs);
};

export const updateJob = async (updatedJob: JobCard) => {
  const jobs = getLocalJobs();
  const newJobs = jobs.map(j => j.id === updatedJob.id ? updatedJob : j);
  saveLocalJobs(newJobs);
};

export const deleteJob = async (jobId: string) => {
  const jobs = getLocalJobs();
  const newJobs = jobs.filter(j => j.id !== jobId);
  saveLocalJobs(newJobs);
};

export const clearDatabase = async () => {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('local-storage-update'));
};
