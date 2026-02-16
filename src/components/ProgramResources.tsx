import React, { useRef, useState } from 'react';
import Card from './Card';
import Accordion from './Accordion';
import { Upload, ExternalLink, FileText, Trash2, Download, Loader2 } from 'lucide-react';
import type { ProgramResource } from '../types';
import { storageService } from '../services/storageService';
import { resourceService } from '../services/supabaseService';

interface ProgramResourcesProps {
    resources: ProgramResource[];
    setResources: React.Dispatch<React.SetStateAction<ProgramResource[]>>;
}

const RESOURCE_CATEGORIES = [
    'Program Work/Action Plan',
    'Policies & Procedures',
    'Governance - Pathway Agreement i.e. MOUs and SLAs'
];

export default function ProgramResources({ resources, setResources }: ProgramResourcesProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>(RESOURCE_CATEGORIES[0]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  const handleDelete = async (resource: ProgramResource) => {
    if (window.confirm('Are you sure you want to delete this resource?')) {
      try {
        // Delete from storage if file exists
        if (resource.storagePath) {
          await storageService.deleteFile(resource.storagePath);
        }
        
        // Delete from database
        await resourceService.delete(resource.id);
        
        // Update local state
        setResources(resources.filter(r => r.id !== resource.id));
        
        alert('Resource deleted successfully');
      } catch (error) {
        console.error('Error deleting resource:', error);
        alert('Failed to delete resource');
      }
    }
  };

  const handleDownload = async (resource: ProgramResource) => {
    if (!resource.storagePath) {
      alert('No file available for download');
      return;
    }

    try {
      await storageService.downloadFile(resource.storagePath, resource.fileName);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download file');
    }
  };

  // FIX: Using React.FC for better type safety and to resolve the `key` prop error.
  const ResourceItem: React.FC<{ resource: ProgramResource }> = ({ resource }) => (
    <div className="bg-white dark:bg-gray-800/80 p-4 rounded-lg shadow-sm flex justify-between items-center transition-all hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-700/50">
        <div className="flex items-center overflow-hidden flex-1">
            <FileText className="h-8 w-8 text-baby-blue-500 dark:text-baby-blue-300 mr-4 flex-shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 dark:text-gray-100 truncate" title={resource.name}>
                    {resource.fileName || resource.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Type: <span className="font-medium">{resource.fileType || resource.type}</span>
                    {resource.fileSize && (
                        <> &bull; Size: <span className="font-medium">{storageService.formatFileSize(resource.fileSize)}</span></>
                    )}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Added: {new Date(resource.dateAdded).toLocaleDateString('en-AU')} at {new Date(resource.dateAdded).toLocaleTimeString('en-AU')}
                </p>
            </div>
        </div>
        <div className="flex items-center gap-1 ml-4">
            {/* Always show download button, even for mock data */}
            <button 
                onClick={() => {
                    if (resource.storagePath) {
                        handleDownload(resource);
                    } else {
                        alert('This is a demo file. Upload a real file to test download functionality.');
                    }
                }}
                className="p-2 text-white bg-lime-green-500 hover:bg-lime-green-600 rounded-lg transition-colors flex items-center gap-1"
                title="Download file"
            >
                <Download className="h-4 w-4" />
                <span className="text-sm font-medium">Download</span>
            </button>
            <button 
                onClick={() => handleDelete(resource)} 
                className="p-2 text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors flex items-center gap-1 ml-1"
                title="Delete resource"
            >
                <Trash2 className="h-4 w-4" />
                <span className="text-sm font-medium">Delete</span>
        </button>
        </div>
    </div>
  );
  
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0]; // Handle one file at a time for now
      
      setIsUploading(true);
      setUploadProgress(`Uploading ${file.name}...`);
      
      try {
        // Upload to Supabase Storage
        const uploadResult = await storageService.uploadFile(file, selectedCategory.toLowerCase().replace(/\s+/g, '-'));
        
        if (uploadResult) {
          // Create resource with file info
          const newResource: ProgramResource = {
            id: `R${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension for display name
          type: file.type.split('/')[1]?.toUpperCase() || 'FILE',
          dateAdded: new Date().toISOString(),
          category: selectedCategory,
            fileUrl: uploadResult.url,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            storagePath: uploadResult.path
          };
          
          // Save to database
          await resourceService.create(newResource);
          
          // Update local state
          setResources(prev => [...prev, newResource]);
          
          alert(`File "${file.name}" uploaded successfully to '${selectedCategory}'!`);
        } else {
          alert('Failed to upload file. Please try again.');
        }
      } catch (error) {
        console.error('Upload error:', error);
        alert('An error occurred while uploading the file');
      } finally {
        setIsUploading(false);
        setUploadProgress('');
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };
  
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-8">
        {/* Upload Section Card */}
        <Card>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Upload New Resource</h2>
            
            {/* Category Selection - More Prominent */}
            <div className="mb-6 bg-baby-blue-50 dark:bg-gray-700 p-4 rounded-lg">
                <label htmlFor="category-select" className="block text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    Step 1: Select Resource Category
                </label>
                <select
                    id="category-select"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-3 text-lg rounded-lg border-2 border-baby-blue-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-lime-green-500 focus:ring-2 focus:ring-lime-green-500 transition-all"
                >
                    {RESOURCE_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Selected category: <span className="font-semibold text-baby-blue-600 dark:text-baby-blue-400">{selectedCategory}</span>
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* File Upload Area */}
                <div className="flex flex-col items-center justify-center p-8 border-3 border-dashed border-lime-green-400 dark:border-lime-green-600 rounded-lg bg-gradient-to-br from-lime-green-50 to-white dark:from-gray-800 dark:to-gray-900 hover:border-lime-green-500 transition-all">
                    <input
                        type="file"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.mp4,.txt,.csv"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={isUploading}
                    />
                    
                    <div className="text-center">
                        <p className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">
                            Step 2: Upload Your File
                        </p>
                        <button
                            onClick={handleUploadClick}
                            disabled={isUploading}
                            className="px-6 py-3 bg-lime-green-500 hover:bg-lime-green-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {isUploading ? (
                                <div className="flex items-center space-x-2">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Uploading...</span>
                                </div>
                            ) : (
                                <div className="flex items-center space-x-2">
                                    <Upload className="w-5 h-5" />
                                    <span>Choose File to Upload</span>
                                </div>
                            )}
                        </button>
                        {uploadProgress && (
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{uploadProgress}</p>
                        )}
                        <div className="mt-4 space-y-1">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                <span className="font-semibold">Accepted formats:</span>
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                                PDF, Word, Excel, Images (JPG, PNG, GIF), Videos (MP4), Text, CSV
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                                Maximum file size: 50MB
                            </p>
                        </div>
                    </div>
                </div>

                {/* External Link & Quick Info */}
                <div className="flex flex-col justify-between p-6 bg-gradient-to-br from-baby-blue-100 to-baby-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-lg">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">
                            Quick Resources
                    </h3>
                        <div className="space-y-3 mb-4">
                            <div className="flex items-start">
                                <span className="text-lime-green-500 mr-2">✓</span>
                                <span className="text-sm text-gray-600 dark:text-gray-400">Upload important documents and resources</span>
                            </div>
                            <div className="flex items-start">
                                <span className="text-lime-green-500 mr-2">✓</span>
                                <span className="text-sm text-gray-600 dark:text-gray-400">Organize by category for easy access</span>
                            </div>
                            <div className="flex items-start">
                                <span className="text-lime-green-500 mr-2">✓</span>
                                <span className="text-sm text-gray-600 dark:text-gray-400">Download files anytime, anywhere</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="border-t border-baby-blue-200 dark:border-gray-700 pt-4">
                        <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">
                            External Resource
                        </h4>
                    <a
                        href="https://refugeehealthguide.org.au"
                        target="_blank"
                        rel="noopener noreferrer"
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-baby-blue-500 hover:bg-baby-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-baby-blue-500 transition-all"
                    >
                            Australian Refugee Health Guide
                            <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                    </div>
                </div>
            </div>
        </Card>

        {/* Uploaded Resources Card */}
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Uploaded Resources</h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    Total: {resources.length} file{resources.length !== 1 ? 's' : ''}
                </span>
            </div>
            <div className="space-y-2">
                 {resources.length === 0 ? (
                    <p className="text-center py-10 text-gray-500 dark:text-gray-400">No resources have been uploaded yet.</p>
                ) : (
                    RESOURCE_CATEGORIES.map(category => {
                        const categoryResources = resources.filter(r => r.category === category);
                        return (
                            <Accordion key={category} title={`${category} (${categoryResources.length})`} startOpen={true} titleClassName="text-baby-blue-500 dark:text-baby-blue-400">
                                {categoryResources.length > 0 ? (
                                    <div className="space-y-3">
                                        {categoryResources.map(resource => (
                                            <ResourceItem key={resource.id} resource={resource} />
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-center py-4 text-gray-500 dark:text-gray-400">No resources in this category.</p>
                                )}
                            </Accordion>
                        );
                    })
                )}
            </div>
        </Card>
    </div>
  );
};