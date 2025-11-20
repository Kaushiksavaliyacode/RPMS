
import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { JobCard } from '../types';

const COLLECTION_NAME = 'jobs';

// --- Real-time Listener ---
export const subscribeToJobs = (onDataChange: (jobs: JobCard[]) => void) => {
  // Ensure DB is initialized before querying
  if (!db) return () => {};

  const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const jobs: JobCard[] = [];
    snapshot.forEach((doc) => {
      jobs.push(doc.data() as JobCard);
    });
    onDataChange(jobs);
  }, (error) => {
    console.error("Error fetching live data:", error);
    // Common error: Missing permissions (Rules) or Invalid Config
    if (error.code === 'permission-denied') {
      alert("Database Permission Denied. Please ensure your Firestore Security Rules are set to test mode (allow read, write: if true;).");
    }
  });

  return unsubscribe;
};

// --- CRUD Operations ---

export const addJobToFirebase = async (job: JobCard) => {
  try {
    await setDoc(doc(db, COLLECTION_NAME, job.id), job);
  } catch (e) {
    console.error("Error adding job:", e);
    alert("Failed to save to cloud. Check internet connection or API Keys.");
  }
};

export const updateJobInFirebase = async (job: JobCard) => {
  try {
    const jobRef = doc(db, COLLECTION_NAME, job.id);
    await updateDoc(jobRef, { ...job });
  } catch (e) {
    console.error("Error updating job:", e);
  }
};

export const deleteJobFromFirebase = async (jobId: string) => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, jobId));
  } catch (e) {
    console.error("Error deleting job:", e);
  }
};

// Deprecated but kept for type compatibility if needed
export const getStoredJobs = (): JobCard[] => [];
export const saveStoredJobs = (jobs: JobCard[]) => {};
export const initializeDemoData = () => [];
