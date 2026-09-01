
import React, { useRef, useState } from 'react';
import { MediaType } from '../types';

interface UploaderProps {
  onFileSelect: (file: File) => void;
  selectedType: MediaType;
}

const Uploader: React.FC<UploaderProps> = ({ onFileSelect, selectedType }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const getAccept = () => {
    switch (selectedType) {
      case MediaType.IMAGE: return "image/*";
      case MediaType.VIDEO: return "video/*";
      case MediaType.AUDIO: return "audio/*";
      default: return "*/*";
    }
  };

  const getIcon = () => {
    switch (selectedType) {
      case MediaType.IMAGE: return "fa-image";
      case MediaType.VIDEO: return "fa-video";
      case MediaType.AUDIO: return "fa-microphone";
      default: return "fa-upload";
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`relative group cursor-pointer transition-all duration-500 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center p-12 overflow-hidden active:scale-[0.98]
        ${isDragging 
          ? 'border-blue-500 bg-blue-500/10 scale-[1.02] shadow-[0_0_60px_rgba(59,130,246,0.3)]' 
          : 'border-zinc-800 hover:border-zinc-600 bg-zinc-900/50'
        }`}
    >
      {/* Scanning Light Effect */}
      <div className="absolute inset-x-0 h-[2px] bg-blue-500/50 blur-sm top-0 opacity-0 group-hover:opacity-100 group-hover:animate-[scan_3s_linear_infinite]"></div>
      
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      <div className={`mb-6 w-20 h-20 rounded-2xl bg-zinc-800 flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] group-hover:bg-zinc-700
        ${isDragging ? 'rotate-12 scale-110 bg-blue-600 text-white shadow-xl' : 'text-blue-400'}`}>
        <i className={`fas ${getIcon()} text-3xl transition-transform duration-500 ${isDragging ? 'animate-pulse' : 'group-hover:rotate-12'}`}></i>
      </div>
      
      <h3 className="text-2xl font-black mb-2 text-zinc-100 tracking-tight group-hover:text-blue-400 transition-colors">
        Analyze {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}
      </h3>
      <p className="text-zinc-500 text-center max-w-xs text-sm leading-relaxed group-hover:text-zinc-300 transition-colors">
        Drag and drop or click to initiate deep spectral scanning for synthetic patterns.
      </p>
      
      <div className="mt-8 px-8 py-2.5 rounded-full bg-blue-600/10 text-blue-400 text-xs font-black tracking-widest border border-blue-500/30 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all duration-300 uppercase">
        Select Media
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
        accept={getAccept()}
        className="hidden"
      />

      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default Uploader;
