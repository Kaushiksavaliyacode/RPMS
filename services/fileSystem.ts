

// Check if the API is supported
export const isFileSystemSupported = () => {
  return 'showOpenFilePicker' in window;
};

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
  
  return handle;
};

// Write content to the file
export const writeToLocalFile = async (fileHandle: any, content: string, append: boolean = false) => {
  if (!fileHandle) throw new Error('No file handle provided');

  const hasPermission = await verifyPermission(fileHandle, true);
  if (!hasPermission) throw new Error('Permission denied');

  // Create a writable stream to the file
  // keepExistingData is required to append. If false (default), file is truncated.
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
