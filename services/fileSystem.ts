

// Check if the API is supported
export const isFileSystemSupported = () => {
  return 'showOpenFilePicker' in window;
};

// --- IndexedDB Logic for Persistence ---
const DB_NAME = 'RPMS_DB';
const STORE_NAME = 'file_handles';

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

export const saveFileHandle = async (handle: any) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(handle, 'default_csv_db');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getSavedFileHandle = async () => {
  const db = await initDB();
  return new Promise<any>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get('default_csv_db');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// --- File System Access API ---

// Verify if we still have permission to write to the file
export const verifyPermission = async (fileHandle: any, readWrite: boolean) => {
  const options: any = {};
  if (readWrite) {
    options.mode = 'readwrite';
  }
  // Check if permission was already granted
  if ((await fileHandle.queryPermission(options)) === 'granted') {
    return true;
  }
  // Request permission
  if ((await fileHandle.requestPermission(options)) === 'granted') {
    return true;
  }
  return false;
};

// Open file picker
export const openLocalFile = async () => {
  if (!isFileSystemSupported()) {
    throw new Error('File System Access API not supported');
  }
  
  const [handle] = await (window as any).showOpenFilePicker({
    types: [
      {
        description: 'CSV Database File',
        accept: {
          'text/csv': ['.csv'],
        },
      },
    ],
    multiple: false,
  });

  // Save for future use
  await saveFileHandle(handle);
  
  return handle;
};

// Clear file content (Truncate)
export const clearLocalFile = async (fileHandle: any) => {
    if (!fileHandle) throw new Error('No file handle');
    const hasPermission = await verifyPermission(fileHandle, true);
    if (!hasPermission) throw new Error('Permission denied');

    const writable = await fileHandle.createWritable(); // Default keepExistingData: false
    await writable.truncate(0);
    await writable.close();
};

// Write content to the file with Retry Logic
export const writeToLocalFile = async (fileHandle: any, content: string, append: boolean = false) => {
  if (!fileHandle) throw new Error('No file handle provided');

  // Verify permission
  const hasPermission = await verifyPermission(fileHandle, true);
  if (!hasPermission) throw new Error('Permission denied');

  let lastError;

  // Simple retry mechanism for file locks (common with Excel/BarTender)
  for (let i = 0; i < 3; i++) {
    try {
        // If append is false, keepExistingData false will clear the file before writing
        const writable = await fileHandle.createWritable({ keepExistingData: append });
        
        if (append) {
            const file = await fileHandle.getFile();
            await writable.seek(file.size);
        }
        
        await writable.write(content);
        await writable.close();
        return; // Success
    } catch (e: any) {
        console.warn(`Write attempt ${i+1} failed:`, e);
        lastError = e;
        
        // If permission denied, don't retry, just fail
        if (e.name === 'NotAllowedError' || e.name === 'SecurityError') {
             throw e;
        }

        // Wait before retry (exponential backoff: 200, 400, 800)
        await new Promise(resolve => setTimeout(resolve, 200 * Math.pow(2, i)));
    }
  }

  throw lastError || new Error("Failed to write to file after multiple attempts. Is it open in Excel?");
};
