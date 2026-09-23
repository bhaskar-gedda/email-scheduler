import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle } from 'lucide-react';
import { campaignsApi, PreviewLeadsResponse } from '../../api/campaigns.api';

export interface FileUploadAreaProps {
  onLeadsLoaded: (emails: string[]) => void;
}

export const FileUploadArea: React.FC<FileUploadAreaProps> = ({ onLeadsLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewLeadsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setError('Please upload a .csv or .txt file containing email leads.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await campaignsApi.previewLeadsFile(file);
      setPreview(res);
      onLeadsLoaded(res.validEmails);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to parse leads file');
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-2">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center p-5 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
          isDragging
            ? 'border-brand-500 bg-brand-50/50'
            : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              processFile(e.target.files[0]);
            }
          }}
        />

        <div className="flex flex-col items-center text-center space-y-1.5">
          <div className="p-2.5 rounded-full bg-white shadow-2xs text-brand-600 border border-slate-100">
            {loading ? (
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <UploadCloud className="w-5 h-5" />
            )}
          </div>
          <div className="text-xs">
            <span className="font-semibold text-brand-600 hover:underline">Click to upload</span>
            <span className="text-slate-500"> or drag and drop CSV or TXT</span>
          </div>
          <p className="text-[11px] text-slate-400">Supported: email column CSV or newline-separated emails</p>
        </div>
      </div>

      {preview && (
        <div className="flex flex-wrap items-center gap-2 p-2.5 bg-brand-50 border border-brand-100 rounded-lg text-xs">
          <div className="flex items-center gap-1.5 text-brand-700 font-medium">
            <CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0" />
            <span>{preview.validCount} valid email addresses detected</span>
          </div>

          {preview.totalDuplicates > 0 && (
            <span className="text-slate-500 text-[11px]">
              ({preview.totalDuplicates} duplicates removed)
            </span>
          )}

          {preview.invalidCount > 0 && (
            <div className="flex items-center gap-1 text-amber-700 text-[11px] ml-auto">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>{preview.invalidCount} invalid entries skipped</span>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-100 rounded-lg text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
