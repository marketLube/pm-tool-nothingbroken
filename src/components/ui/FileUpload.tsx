import React, { useState, useRef } from 'react';

interface FileUploadProps {
  label: string;
  onChange: (file: File | null) => void;
  acceptedFileTypes?: string;
  maxSizeInMb?: number;
  required?: boolean;
  className?: string;
  preview?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  label,
  onChange,
  acceptedFileTypes = 'image/*',
  maxSizeInMb = 5,
  required = false,
  className = '',
  preview
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

  return (
    <div className={`${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="flex items-center space-x-4">
        {previewUrl && (
          <div className="relative w-16 h-16">
            <img 
              src={previewUrl} 
              alt="Preview" 
              className="w-16 h-16 rounded-full object-cover border border-gray-300"
            />
            <button
              type="button"
              onClick={handleRemoveFile}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 focus:outline-none"
            >
              ×
            </button>
          </div>
        )}
      
        <div className="flex-1">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            accept={acceptedFileTypes}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
          >
            {previewUrl ? 'Change' : 'Select'} Image
          </label>
          
          <p className="mt-1 text-xs text-gray-500">
            {acceptedFileTypes.replace('*', '')} files up to {maxSizeInMb}MB
          </p>
        </div>
      </div>
      
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default FileUpload; 