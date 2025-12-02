

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

// Write content to the file
export const writeToLocalFile = async (fileHandle: any, content: string, append: boolean = false) => {
  if (!fileHandle) throw new Error('No file handle provided');

  // Verify permission before writing. 
  // If this fails (user denies), the promise rejects.
  const hasPermission = await verifyPermission(fileHandle, true);
  if (!hasPermission) throw new Error('Permission denied');

  // Create a writable stream to the file
  const writable = await fileHandle.createWritable({ keepExistingData: append });
  
  if (append) {
    // Move cursor to the end of the file
    const file = await fileHandle.getFile();
    await writable.seek(file.size);
  }
  
  // Write the contents
  await writable.write(content);
  
  // Close the file
  await writable.close();
};
