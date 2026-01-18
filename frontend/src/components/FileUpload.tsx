import React, { useCallback, useState } from 'react';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';

interface FileUploadProps {
  onFileSelect: (content: string, fileName: string) => void;
  accept?: string;
  maxSize?: number; // in bytes
  className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  accept = '.sol,.vy,.txt',
  maxSize = 5 * 1024 * 1024, // 5MB default
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: number } | null>(null);

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize) {
      return `File size exceeds ${(maxSize / 1024 / 1024).toFixed(0)}MB limit`;
    }

    // Check file extension
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    const acceptedExtensions = accept.split(',').map(ext => ext.trim());
    
    if (!acceptedExtensions.includes(extension) && !acceptedExtensions.includes('.*')) {
      return `File type not supported. Accepted types: ${accept}`;
    }

    return null;
  };

  const handleFile = useCallback(async (file: File) => {
    setError(null);

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSelectedFile({ name: file.name, size: file.size });

    try {
      const content = await file.text();
      onFileSelect(content, file.name);
    } catch (err: any) {
      setError(`Failed to read file: ${err.message}`);
    }
  }, [onFileSelect, accept, maxSize]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleClear = useCallback(() => {
    setSelectedFile(null);
    setError(null);
  }, []);

  return (
    <div className={className}>
      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragging
            ? 'border-primary bg-primary/10'
            : 'border-white/10 bg-black/50 hover:border-white/20'
        }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="p-8 text-center">
          {selectedFile ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-3">
                <FileText className="w-8 h-8 text-primary" />
                <div className="text-left">
                  <p className="font-medium text-white">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="text-muted-foreground hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 text-white/40 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                Drag and drop your contract file
              </h3>
              <p className="text-sm text-white/60 mb-4">
                or click to browse
              </p>
              <input
                type="file"
                accept={accept}
                onChange={handleFileInput}
                className="hidden"
                id="file-upload-input"
              />
              <label htmlFor="file-upload-input">
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer"
                  asChild
                >
                  <span>Select File</span>
                </Button>
              </label>
              <p className="text-xs text-white/40 mt-4">
                Supported: {accept.replace(/\./g, '').replace(/,/g, ', ')} (Max {maxSize / 1024 / 1024}MB)
              </p>
            </>
          )}
        </div>
      </Card>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};
