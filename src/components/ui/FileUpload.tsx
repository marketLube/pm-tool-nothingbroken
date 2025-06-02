import React, { useState, useRef } from 'react';

interface FileUploadProps {
  label: string;
  onChange: (file: File | null) => void;
  acceptedFileTypes?: string;
  maxSizeInMb?: number;
  required?: boolean;
  className?: string;
  preview?: string;
  compact?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
  label,
  onChange,
  acceptedFileTypes = 'image/*',
  maxSizeInMb = 5,
  required = false,
  className = '',
  preview,
  compact = false
}) => {
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(preview || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setError(null);
    
    // Clear preview if no file selected
    if (!file) {
      setPreviewUrl(null);
      onChange(null);
      return;
    }
    
    // Validate file type
    if (acceptedFileTypes && !file.type.match(acceptedFileTypes.replace(/\*/g, '.*'))) {
      setError(`File type not supported. Please use ${acceptedFileTypes}`);
      onChange(null);
      return;
    }
    
    // Validate file size
    const maxSizeBytes = maxSizeInMb * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`File size exceeds ${maxSizeInMb}MB limit`);
      onChange(null);
      return;
    }
    
    // Create preview URL for image
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    
    // Pass the file to parent component
    onChange(file);
    
    // Clean up the object URL when component unmounts
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  };

  const handleRemoveFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setPreviewUrl(null);
    setError(null);
    onChange(null);
  };

  // Generate unique ID for accessibility
  const fileInputId = `file-upload-${Math.random().toString(36).substr(2, 9)}`;

  if (compact) {
    return (
      <div className={`${className}`}>
        {/* Centered label */}
        {label && (
          <div className="text-center mb-3">
            <label className="text-sm font-medium text-gray-700">
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </label>
          </div>
        )}
        
        {/* Compact vertical layout */}
        <div className="flex flex-col items-center space-y-3">
          {/* Avatar preview */}
          <div className="relative">
            {previewUrl ? (
              <div className="relative w-20 h-20 group">
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-300 shadow-sm"
                />
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                  title="Remove image"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
          </div>

          {/* Upload controls - centered */}
          <div className="flex flex-col items-center space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              accept={acceptedFileTypes}
              className="hidden"
              id={fileInputId}
            />
            <label
              htmlFor={fileInputId}
              className="cursor-pointer inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              {previewUrl ? 'Change' : 'Upload'} Image
            </label>
            
            {/* Centered description text */}
            <p className="text-xs text-gray-500 text-center max-w-xs">
              {acceptedFileTypes.replace('*', '')} files up to {maxSizeInMb}MB
            </p>
          </div>
        </div>
        
        {error && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600 text-center">{error}</p>
          </div>
        )}
      </div>
    );
  }

  // Default horizontal layout
  return (
    <div className={`${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="flex items-start space-x-4">
        {/* Preview section */}
        {previewUrl && (
          <div className="flex-shrink-0">
            <div className="relative w-16 h-16">
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="w-16 h-16 rounded-full object-cover border border-gray-300"
              />
              <button
                type="button"
                onClick={handleRemoveFile}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                title="Remove image"
              >
                ×
              </button>
            </div>
          </div>
        )}
      
        {/* Upload controls section */}
        <div className="flex-1 min-w-0">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            accept={acceptedFileTypes}
            className="hidden"
            id={fileInputId}
          />
          <label
            htmlFor={fileInputId}
            className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            {previewUrl ? 'Change' : 'Select'} Image
          </label>
          
          <p className="mt-1 text-xs text-gray-500">
            {acceptedFileTypes.replace('*', '')} files up to {maxSizeInMb}MB
          </p>
        </div>
      </div>
      
      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
};

export default FileUpload; 