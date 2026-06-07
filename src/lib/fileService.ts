import { db, handleFirestoreError, OperationType, auth } from './firebase';
import { collection, addDoc, updateDoc, doc, setDoc, getDocs } from 'firebase/firestore';

export interface FileHistoryEvent {
  action: 'upload' | 'download' | 'delete';
  timestamp: string;
  details: string;
}

export interface FileRecord {
  id?: string;
  userId: string;
  userEmail?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  downloadUrl: string;
  status: 'active' | 'deleted';
  downloadCount: number;
  history: FileHistoryEvent[];
  createdAt: any; // Firestore Timestamp or Date object
  updatedAt: any;
  hasChunks?: boolean;
  totalChunks?: number;
}

const CHUNK_SIZE = 500 * 1024; // 500 Safe KB per chunk document

/**
 * ArrayBuffer binary parser to standard Base64 representation.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Slice custom binary files into safe, small and highly queryable Base64 strings.
 */
export async function sliceFileIntoChunks(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const chunks: string[] = [];
      const totalBytes = arrayBuffer.byteLength;
      
      let offset = 0;
      while (offset < totalBytes) {
        const chunkBuf = arrayBuffer.slice(offset, offset + CHUNK_SIZE);
        chunks.push(arrayBufferToBase64(chunkBuf));
        offset += CHUNK_SIZE;
      }
      resolve(chunks);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Reassemble base64 chunks back into native binary Blobs.
 */
export function assembleChunksToBlob(chunks: string[], mimeType: string): Blob {
  const byteCharactersList: Uint8Array[] = [];
  
  for (const base64 of chunks) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteCharactersList.push(byteArray);
  }
  
  return new Blob(byteCharactersList, { type: mimeType });
}

/**
 * Stream and download binary fragments directly from custom subcollection chunks.
 */
export async function fetchFileFromChunks(fileId: string, mimeType: string): Promise<Blob> {
  const chunksCollectionRef = collection(db, 'files', fileId, 'chunks');
  const snapshot = await getDocs(chunksCollectionRef);
  
  const chunkDocs = snapshot.docs.map(doc => doc.data());
  chunkDocs.sort((a, b) => a.chunkIndex - b.chunkIndex);
  
  const base64Chunks = chunkDocs.map(c => c.data);
  return assembleChunksToBlob(base64Chunks, mimeType);
}

/**
 * Upload a file to the server-side directory sandbox, then index it inside Firestore securely.
 */
export async function uploadUserFile(file: File, userId: string): Promise<FileRecord> {
  // Use Multipart FormData to send to server backend API
  const formData = new FormData();
  formData.append('file', file);
  formData.append('userId', userId);

  try {
    const res = await fetch('/api/files/upload', {
      method: 'POST',
      headers: {
        'X-User-Id': userId
      },
      body: formData
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server responded with status ${res.status}`);
    }

    const result = await res.json();
    const refCollection = 'files';
    const nowISO = new Date().toISOString();

    // Splitting files into base64 chunks
    const chunks = await sliceFileIntoChunks(file);

    const fileRecordData = {
      userId,
      userEmail: auth.currentUser?.email || '',
      fileName: result.fileName,
      fileSize: result.fileSize,
      mimeType: result.mimeType || 'application/octet-stream',
      storagePath: result.storagePath,
      downloadUrl: result.downloadUrl,
      status: 'active' as const,
      downloadCount: 0,
      hasChunks: true,
      totalChunks: chunks.length,
      history: [
        {
          action: 'upload' as const,
          timestamp: nowISO,
          details: `Uploaded culinary asset securely: "${result.fileName}" of size ${formatBytes(result.fileSize)}`
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Index metadata and history in Firestore
    const docRef = await addDoc(collection(db, refCollection), fileRecordData);

    // Save individual chunks in parallel to drastically improve speed
    await Promise.all(
      chunks.map((chunk, i) => {
        const chunkDocRef = doc(db, 'files', docRef.id, 'chunks', String(i));
        return setDoc(chunkDocRef, {
          fileId: docRef.id,
          chunkIndex: i,
          data: chunk
        });
      })
    );

    return {
      id: docRef.id,
      ...fileRecordData
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `files_upload_${file.name}`);
    throw error;
  }
}

/**
 * Log a download operation in Firestore for the transaction/audit history.
 */
export async function logFileDownload(fileId: string, currentHistory: FileHistoryEvent[], currentCount: number): Promise<void> {
  const fileRef = doc(db, 'files', fileId);
  const nowISO = new Date().toISOString();

  const updatedHistory = [
    ...currentHistory,
    {
      action: 'download' as const,
      timestamp: nowISO,
      details: 'Culinary asset downloaded/viewed.'
    }
  ];

  try {
    await updateDoc(fileRef, {
      downloadCount: currentCount + 1,
      history: updatedHistory,
      updatedAt: new Date()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `files_download_log_${fileId}`);
  }
}

/**
 * Delete a file: Triggers server-side filesystem deletion and archives Firestore document status to 'deleted'
 */
export async function deleteUserFile(fileId: string, storagePath: string, currentHistory: FileHistoryEvent[]): Promise<void> {
  try {
    await fetch('/api/files/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ storagePath })
    });
  } catch (err: any) {
    console.error('Local file filesystem sync deletion skipped or failed:', err);
  }

  const fileRef = doc(db, 'files', fileId);
  const nowISO = new Date().toISOString();

  const updatedHistory = [
    ...currentHistory,
    {
      action: 'delete' as const,
      timestamp: nowISO,
      details: 'Culinary asset removed from local filesystem. Document archived.'
    }
  ];

  try {
    await updateDoc(fileRef, {
      status: 'deleted' as const,
      history: updatedHistory,
      updatedAt: new Date()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `files_delete_${fileId}`);
  }
}

/**
 * Helper to convert bytes to readable format.
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
