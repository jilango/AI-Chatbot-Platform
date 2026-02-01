'use client';

import { useFileStore, ProjectFile } from '@/store/fileStore';
import { useState, useEffect } from 'react';

interface FileListProps {
  projectId: string;
}

export default function FileList({ projectId }: FileListProps) {
  const { files, loadProjectFiles, deleteFile, isLoading } = useFileStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load files when component mounts or projectId changes
  useEffect(() => {
    if (projectId) {
      loadProjectFiles(projectId);
    }
  }, [projectId, loadProjectFiles]);

  const handleDelete = async (fileId: string, filename: string) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"?`)) {
      return;
    }

    setDeletingId(fileId);
    try {
      await deleteFile(fileId);
    } catch (error) {
      console.error('Failed to delete file:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (fileType: string | null): string => {
    if (!fileType) return '📄';
    const type = fileType.toLowerCase();
    if (type === 'pdf') return '📕';
    if (['txt', 'md', 'text'].includes(type)) return '📄';
    if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(type)) return '🖼️';
    if (['zip', 'rar', 'tar', 'gz'].includes(type)) return '📦';
    if (['py', 'js', 'ts', 'java', 'cpp', 'c'].includes(type)) return '💻';
    return '📄';
  };

  if (isLoading && files.length === 0) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="bg-card rounded-lg p-4 border border-border animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No files uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 animate-in fade-in duration-300">
      {files.map((file, index) => (
        <div
          key={file.id}
          className="flex items-center justify-between p-3 bg-card rounded-lg border border-border hover:bg-muted/50 transition-colors group animate-in fade-in slide-in-from-bottom-2 duration-300"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-2xl flex-shrink-0">{getFileIcon(file.file_type)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.filename}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                <span>{formatFileSize(file.file_size)}</span>
                <span>•</span>
                <span>{formatDate(file.uploaded_at)}</span>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => handleDelete(file.id, file.filename)}
            disabled={deletingId === file.id}
            className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
            aria-label={`Delete ${file.filename}`}
          >
            {deletingId === file.id ? (
              <div className="w-4 h-4 border-2 border-destructive border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
          </button>
        </div>
      ))}
    </div>
  );
}
