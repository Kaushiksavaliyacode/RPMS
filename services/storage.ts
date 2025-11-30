
import { JobCard } from '../types';
import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  getDocs,
  writeBatch
} from 'firebase/firestore';

// --- Real-time Listener (Firebase) ---
export const subscribeToJobs = (onDataChange: (jobs: JobCard[]) => void) => {
  
  const q = query(collection(db, "jobs"), orderBy("createdAt", "desc"));
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const jobs = snapshot.docs.map(doc => doc.data() as JobCard);
    onDataChange(jobs);
  }, (error) => {
    console.error("Firebase subscription error:", error);
  });

  return () => {
    unsubscribe();
  };
};

// --- CRUD Operations ---

export const addJob = async (job: JobCard) => {
  try {
    await setDoc(doc(db, "jobs", job.id), job);
  } catch (error) {
    console.error('Error adding job to Firebase:', error);
    alert('Failed to save job to cloud.');
  }
};

export const updateJob = async (updatedJob: JobCard) => {
  try {
    const jobRef = doc(db, "jobs", updatedJob.id);
    await updateDoc(jobRef, updatedJob as any);
  } catch (error) {
    console.error('Error updating job in Firebase:', error);
  }
};

export const deleteJob = async (jobId: string) => {
  try {
    await deleteDoc(doc(db, "jobs", jobId));
  } catch (error) {
    console.error('Error deleting job from Firebase:', error);
  }
};

export const clearDatabase = async () => {
  try {
    const q = query(collection(db, "jobs"));
    const snapshot = await getDocs(q);
    
    // Firestore batches allow up to 500 operations. 
    // If there are more than 500 docs, this would need to be chunked.
    // For this app scale, a single batch is likely sufficient for a reset.
    const batch = writeBatch(db);
    
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  } catch (error) {
    console.error('Error clearing database:', error);
  }
};
