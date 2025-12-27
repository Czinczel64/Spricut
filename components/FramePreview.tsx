import React, { useState, useEffect } from 'react';
import { ProcessedFrame } from '../types';
import { Image as ImageIcon, Copy, Check, X, ZoomIn } from 'lucide-react';

interface FramePreviewProps {
  frames: ProcessedFrame[];
  isLoading: boolean;
}

const FramePreview: React.FC<FramePreviewProps> = ({ frames, isLoading }) => {
  const [selectedFrameId, setSelectedFrameId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset selection if frames list becomes empty (e.g. new upload)
  useEffect(() => {
    if (frames.length === 0) {
      setSelectedFrameId(null);
    }
  }, [frames.length]);

  const selectedFrame = frames.find(f => f.id === selectedFrameId);

  const handleCopy = async () => {
    if (!selectedFrame) return;
    try {
      await navigator.clipboard.writeText(selectedFrame.dataUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  if (frames.length === 0 && !isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 p-12 bg-slate-800/50 rounded-xl border border-dashed border-slate-700">
        <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-lg font-medium">Visualização dos Frames</p>
        <p className="text-sm">Configure a grade para ver o resultado aqui.</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-slate-800 rounded-xl border border-slate-700 flex flex-col overflow-hidden relative">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50 flex-shrink-0">
        <h2 className="text-lg font-semibold text-slate-100">Preview</h2>
        <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-full">
          {frames.length} frames
        </span>
      </div>
      
      {/* Grid */}
      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 pb-4">
            {frames.map((frame) => (
              <div 
                key={frame.id} 
                onClick={() => setSelectedFrameId(frame.id === selectedFrameId ? null : frame.id)}
                className={`
                  group relative bg-slate-900 rounded-lg p-2 border cursor-pointer transition-all duration-200
                  ${selectedFrameId === frame.id 
                    ? 'border-indigo-500 ring-2 ring-indigo-500/50 shadow-lg shadow-indigo-500/20 z-10 scale-105' 
                    : 'border-slate-700/50 hover:border-indigo-500/50 hover:scale-[1.02]'}
                `}
              >
                <div className="aspect-square flex items-center justify-center overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]">
                  {/* Checkerboard background for transparency */}
                  <div className="absolute inset-0 opacity-10 pointer-events-none" 
                       style={{
                         backgroundImage: `linear-gradient(45deg, #333 25%, transparent 25%), 
                                           linear-gradient(-45deg, #333 25%, transparent 25%), 
                                           linear-gradient(45deg, transparent 75%, #333 75%), 
                                           linear-gradient(-45deg, transparent 75%, #333 75%)`,
                         backgroundSize: `20px 20px`,
                         backgroundPosition: `0 0, 0 10px, 10px -10px, -10px 0px`
                       }} 
                  />
                  <img 
                    src={frame.dataUrl} 
                    alt={`Frame ${frame.id}`} 
                    className="relative z-10 max-w-full max-h-full object-contain pixelated"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
                <div className={`
                  absolute top-1 left-1 bg-black/60 backdrop-blur-sm text-white text-[10px] px-1.5 rounded transition-opacity
                  ${selectedFrameId === frame.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                `}>
                  #{frame.id}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Details Panel Footer */}
      {selectedFrame && !isLoading && (
        <div className="border-t border-slate-700 bg-slate-900 p-4 animate-in slide-in-from-bottom-2 duration-200 shadow-xl z-20">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Thumbnail */}
            <div className="w-16 h-16 bg-slate-800 rounded-lg border border-slate-700 p-1 flex items-center justify-center flex-shrink-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]">
               <img 
                 src={selectedFrame.dataUrl} 
                 className="max-w-full max-h-full object-contain pixelated" 
                 style={{ imageRendering: 'pixelated' }}
               />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 w-full">
              <div className="flex justify-between items-start">
                <div>
                   <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                     Frame #{selectedFrame.id}
                     <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                       ID: {selectedFrame.id}
                     </span>
                   </h3>
                   <div className="text-xs text-slate-400 mt-1 space-x-2 flex items-center">
                     <span className="font-mono text-indigo-300">{selectedFrame.width}x{selectedFrame.height}</span>
                     <span className="text-slate-700">|</span>
                     <span>PNG</span>
                   </div>
                </div>
                <button 
                  onClick={() => setSelectedFrameId(null)}
                  className="text-slate-500 hover:text-slate-300 p-1 hover:bg-slate-800 rounded transition-colors"
                  title="Fechar detalhes"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="mt-3">
                <button
                  onClick={handleCopy}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all w-full sm:w-auto justify-center
                    ${copied 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'}
                  `}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Data URL Copiado!' : 'Copiar Data URL'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FramePreview;