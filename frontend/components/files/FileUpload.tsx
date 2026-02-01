'use client';

import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { useFileStore } from '@/store/fileStore';

interface FileUploadProps {
  projectId: string;
  onUploadComplete?: () => void;
}

export interface FileUploadHandle {
  triggerUpload: () => void;
}

const FileUpload = forwardRef<FileUploadHandle, FileUploadProps>(({ projectId, onUploadComplete }, ref) => {
  const { uploadFile, isLoading, error } = useFileStore();
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    triggerUpload: () => {
      fileInputRef.current?.click();
    }
  }));

  const handleFile = async (file: File) => {
    try {
      await uploadFile(projectId, file);
      onUploadComplete?.();
    } catch (err) {
      console.error('File upload failed:', err);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="w-full animate-in fade-in duration-200">
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 bg-card'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleChange}
          disabled={isLoading}
        />
        
        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium">
                Drop a file here or click to upload
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Max size: 10MB
              </p>
            </div>
          </div>
        )}
      </div>
      
      {error && (
        <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
});

FileUpload.displayName = 'FileUpload';

export default FileUpload;
