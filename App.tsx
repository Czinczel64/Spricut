import React, { useState, useEffect, useCallback } from 'react';
import { Scissors, RefreshCw } from 'lucide-react';
import SpriteUploader from './components/SpriteUploader';
import ImageEditor from './components/ImageEditor';
import Controls from './components/Controls';
import FramePreview from './components/FramePreview';
import { sliceSpritesheet, detectSprites, sliceFromRects, loadImage, performFloodFill, applyTransparency } from './utils/spriteUtils';
import { UploadedImage, SpriteConfig, ProcessedFrame, Rect, Color } from './types';

const App: React.FC = () => {
  const [image, setImage] = useState<UploadedImage | null>(null);
  const [config, setConfig] = useState<SpriteConfig>({ 
    mode: 'grid', 
    rows: 1, 
    cols: 1, 
    padding: 0, 
    removeBackground: false,
    backgroundColor: null,
    useCustomSize: false,
    customWidth: 64,
    customHeight: 64
  });
  const [frames, setFrames] = useState<ProcessedFrame[]>([]);
  
  // State to hold rects for different modes
  const [detectedRects, setDetectedRects] = useState<Rect[]>([]);
  const [manualRects, setManualRects] = useState<Rect[]>([]);
  
  // Magic Wand Selection State
  const [selectionMask, setSelectionMask] = useState<Uint8Array | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isWandMode, setIsWandMode] = useState(false);

  // Effect to handle processing based on config mode
  useEffect(() => {
    if (!image) return;

    const process = async () => {
      setIsProcessing(true);
      try {
        const customSize = config.useCustomSize ? { width: config.customWidth, height: config.customHeight } : undefined;

        if (config.mode === 'smart') {
            const imgEl = await loadImage(image.src);
            const rects = detectSprites(imgEl);
            setDetectedRects(rects);
            const sliced = await sliceFromRects(image.src, rects, config.removeBackground, config.backgroundColor, customSize);
            setFrames(sliced);
        } else if (config.mode === 'manual') {
            // Use manual rects state
            const sliced = await sliceFromRects(image.src, manualRects, config.removeBackground, config.backgroundColor, customSize);
            setFrames(sliced);
        } else {
            // Grid Mode
            const frameWidth = Math.floor(image.originalWidth / config.cols);
            const frameHeight = Math.floor(image.originalHeight / config.rows);
            
            const gridRects: Rect[] = [];
            for(let r=0; r<config.rows; r++) {
                for(let c=0; c<config.cols; c++) {
                    gridRects.push({
                        x: c * frameWidth,
                        y: r * frameHeight,
                        width: frameWidth,
                        height: frameHeight
                    });
                }
            }
            setDetectedRects(gridRects);
            const sliced = await sliceSpritesheet(image.src, config.rows, config.cols, config.removeBackground, config.backgroundColor, customSize);
            setFrames(sliced);
        }
      } catch (err) {
        console.error("Error slicing sprite:", err);
      } finally {
        setIsProcessing(false);
      }
    };

    // Debounce slightly for smoothness
    const timer = setTimeout(process, 100);
    return () => clearTimeout(timer);

  }, [image, config, manualRects]); // Depend on full config object

  const handleImageUpload = useCallback((uploaded: UploadedImage) => {
    setImage(uploaded);
    setConfig({ 
      mode: 'grid', 
      rows: 1, 
      cols: 1, 
      padding: 0, 
      removeBackground: false,
      backgroundColor: null,
      useCustomSize: false,
      customWidth: 64,
      customHeight: 64
    });
    setFrames([]);
    setDetectedRects([]);
    setManualRects([]);
    setIsWandMode(false);
    setSelectionMask(null);
  }, []);

  const handleReset = () => {
    setImage(null);
    setFrames([]);
    setDetectedRects([]);
    setManualRects([]);
    setIsWandMode(false);
    setSelectionMask(null);
  };

  // Manual Mode Handlers
  const addManualRect = (rect: Rect) => {
    setManualRects(prev => [...prev, rect]);
  };

  const removeManualRect = (index: number) => {
    setManualRects(prev => prev.filter((_, i) => i !== index));
  };

  const clearManualRects = () => {
    setManualRects([]);
  };
  
  const handleWandSelect = async (x: number, y: number) => {
      if (!image) return;
      // Perform flood fill
      const imgEl = await loadImage(image.src);
      const mask = performFloodFill(imgEl, x, y);
      setSelectionMask(mask);
  };

  const handleConfirmRemoval = async () => {
      if (!image || !selectionMask) return;
      setIsProcessing(true);
      try {
        const imgEl = await loadImage(image.src);
        const newSrc = applyTransparency(imgEl, selectionMask);
        
        setImage({
            ...image,
            src: newSrc
        });
        setSelectionMask(null);
        // Config will trigger reprocessing automatically via useEffect
      } catch (e) {
        console.error(e);
      } finally {
        setIsProcessing(false);
      }
  };

  const handleCancelSelection = () => {
      setSelectionMask(null);
  };

  // Determine which set of rects to show in editor
  const displayRects = config.mode === 'manual' ? manualRects : detectedRects;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 selection:bg-indigo-500/30 font-sans">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-600/20">
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Sprite<span className="text-indigo-400">Cutter</span></h1>
          </div>
          <div className="flex items-center gap-4">
             {image && (
                <button 
                  onClick={handleReset}
                  className="text-xs flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> Nova Imagem
                </button>
             )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!image ? (
          <div className="max-w-2xl mx-auto mt-12">
             <SpriteUploader onImageUpload={handleImageUpload} />
          </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] min-h-[600px]">
              
              {/* Left Column: Editor & Original Image */}
              <div className="lg:col-span-5 flex flex-col gap-6 h-full overflow-hidden">
                 {/* Visual Editor (Top Half of Left Col) */}
                 <div className="flex-shrink-0 max-h-[50%] overflow-y-auto custom-scrollbar bg-slate-950 rounded-xl border border-slate-800">
                    <ImageEditor 
                        image={image} 
                        rects={displayRects} 
                        mode={config.mode}
                        onAddManualRect={addManualRect}
                        onRemoveManualRect={removeManualRect}
                        isWandMode={isWandMode}
                        onWandSelect={handleWandSelect}
                        selectionMask={selectionMask}
                    />
                 </div>
                 
                 {/* Controls (Bottom Half of Left Col) */}
                 <div className="flex-1 min-h-0">
                    <Controls 
                      image={image} 
                      config={config} 
                      onConfigChange={setConfig} 
                      processedFrames={frames}
                      isProcessing={isProcessing}
                      onClearManual={clearManualRects}
                      isWandMode={isWandMode}
                      setIsWandMode={setIsWandMode}
                      selectionMask={selectionMask}
                      onConfirmRemoval={handleConfirmRemoval}
                      onCancelSelection={handleCancelSelection}
                    />
                 </div>
              </div>

              {/* Right Column: Results Preview */}
              <div className="lg:col-span-7 h-full min-h-0">
                <FramePreview frames={frames} isLoading={isProcessing} />
              </div>

            </div>
        )}
      </main>
    </div>
  );
};

export default App;