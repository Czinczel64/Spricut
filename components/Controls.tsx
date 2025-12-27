import React from 'react';
import { Grid3X3, Download, Layers, Wand2, Lasso, Trash2, Eraser, Maximize, Check, X } from 'lucide-react';
import { UploadedImage, SpriteConfig, ProcessedFrame } from '../types';
import JSZip from 'jszip';

interface ControlsProps {
  image: UploadedImage | null;
  config: SpriteConfig;
  processedFrames: ProcessedFrame[];
  onConfigChange: (config: SpriteConfig) => void;
  onClearManual: () => void;
  isProcessing: boolean;
  isWandMode: boolean;
  setIsWandMode: (v: boolean) => void;
  selectionMask: Uint8Array | null;
  onConfirmRemoval: () => void;
  onCancelSelection: () => void;
}

const Controls: React.FC<ControlsProps> = ({ 
  image, 
  config, 
  onConfigChange, 
  onClearManual,
  processedFrames,
  isProcessing,
  isWandMode,
  setIsWandMode,
  selectionMask,
  onConfirmRemoval,
  onCancelSelection
}) => {
  const [isZipping, setIsZipping] = React.useState(false);

  if (!image) {
    return (
      <div className="p-6 bg-slate-800 rounded-xl border border-slate-700 h-full flex items-center justify-center text-slate-500">
        <div className="text-center">
          <Layers className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Faça upload de uma imagem para começar</p>
        </div>
      </div>
    );
  }

  const frameWidth = Math.floor(image.originalWidth / config.cols);
  const frameHeight = Math.floor(image.originalHeight / config.rows);
  const totalFrames = processedFrames.length;

  const handleDownload = async () => {
    if (processedFrames.length === 0) return;

    setIsZipping(true);
    try {
      const zip = new JSZip();
      
      processedFrames.forEach((frame) => {
        const base64Data = frame.dataUrl.split(',')[1];
        zip.file(`frame_${frame.id}.png`, base64Data, { base64: true });
      });

      const content = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${image.file.name.split('.')[0]}_frames.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to zip files", error);
      alert("Erro ao gerar o arquivo ZIP.");
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 flex flex-col overflow-hidden h-full">
      <div className="p-4 border-b border-slate-700 bg-slate-800/50">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-100">
          <Grid3X3 className="w-5 h-5 text-indigo-400" />
          Configurações
        </h2>
      </div>

      <div className="p-6 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
        {/* Mode Toggle */}
        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700">
          <button
            onClick={() => onConfigChange({ ...config, mode: 'grid' })}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs sm:text-sm font-medium rounded-md transition-all
              ${config.mode === 'grid' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
            title="Grade Manual"
          >
            <Grid3X3 className="w-4 h-4" />
            <span className="hidden sm:inline">Grade</span>
          </button>
          <button
            onClick={() => onConfigChange({ ...config, mode: 'smart' })}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs sm:text-sm font-medium rounded-md transition-all
              ${config.mode === 'smart' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
            title="Smart Detect"
          >
            <Wand2 className="w-4 h-4" />
            <span className="hidden sm:inline">Smart</span>
          </button>
          <button
            onClick={() => onConfigChange({ ...config, mode: 'manual' })}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs sm:text-sm font-medium rounded-md transition-all
              ${config.mode === 'manual' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
            title="Seleção Laço"
          >
            <Lasso className="w-4 h-4" />
            <span className="hidden sm:inline">Laço</span>
          </button>
        </div>

        {/* Info Card */}
        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50 space-y-2 text-sm">
           <div className="flex justify-between text-slate-400">
            <span>Dimensão Original:</span>
            <span className="text-slate-200 font-mono">{image.originalWidth} x {image.originalHeight}px</span>
          </div>
          {config.mode === 'grid' && (
             <div className="flex justify-between text-slate-400">
               <span>Tamanho do Frame:</span>
               <span className="text-indigo-300 font-mono font-bold">{frameWidth} x {frameHeight}px</span>
             </div>
          )}
          <div className="flex justify-between text-slate-400">
            <span>Frames:</span>
            <span className="text-slate-200 font-mono">{totalFrames}</span>
          </div>
        </div>

        {/* Global Options */}
        <div className="space-y-4">
             {/* MAGIC WAND (Manual Selection & Remove) */}
             <div className="p-3 bg-slate-900 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <Wand2 className={`w-4 h-4 ${isWandMode ? 'text-indigo-400' : 'text-slate-400'}`} />
                        <div className="flex flex-col">
                            <span className="text-sm text-slate-200 font-medium">Varinha Mágica</span>
                            <span className="text-[10px] text-slate-500">Selecione e remova áreas do fundo</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsWandMode(!isWandMode)}
                        className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${isWandMode ? 'bg-indigo-600' : 'bg-slate-700'}`}
                    >
                        <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 shadow-sm ${isWandMode ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                </div>

                {isWandMode && (
                   <div className="animate-in fade-in slide-in-from-top-2 duration-200 space-y-2">
                        {!selectionMask ? (
                            <p className="text-xs text-slate-500 italic text-center py-2">
                                Clique na imagem para selecionar o fundo.
                            </p>
                        ) : (
                            <div className="flex gap-2">
                                <button 
                                    onClick={onConfirmRemoval}
                                    className="flex-1 flex items-center justify-center gap-1 bg-red-500 hover:bg-red-600 text-white text-xs py-2 rounded transition-colors"
                                >
                                    <Trash2 className="w-3 h-3" />
                                    Remover
                                </button>
                                <button 
                                    onClick={onCancelSelection}
                                    className="flex-1 flex items-center justify-center gap-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs py-2 rounded transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                    Cancelar
                                </button>
                            </div>
                        )}
                   </div>
                )}
            </div>

             {/* Remove Background Global (Eraser) */}
             <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors">
                <div className="flex items-center gap-2.5">
                    <Eraser className={`w-4 h-4 ${config.removeBackground ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <div className="flex flex-col">
                        <span className="text-sm text-slate-200 font-medium">Remover Cor (Global)</span>
                        <span className="text-[10px] text-slate-500">Remove a cor do pixel (0,0)</span>
                    </div>
                </div>
                <button
                    onClick={() => onConfigChange({ ...config, removeBackground: !config.removeBackground })}
                    className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${config.removeBackground ? 'bg-indigo-600' : 'bg-slate-700'}`}
                >
                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 shadow-sm ${config.removeBackground ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
            </div>

            {/* Custom Size */}
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <Maximize className={`w-4 h-4 ${config.useCustomSize ? 'text-indigo-400' : 'text-slate-400'}`} />
                        <div className="flex flex-col">
                            <span className="text-sm text-slate-200 font-medium">Tamanho Personalizado</span>
                            <span className="text-[10px] text-slate-500">Forçar largura e altura de saída</span>
                        </div>
                    </div>
                    <button
                        onClick={() => onConfigChange({ ...config, useCustomSize: !config.useCustomSize })}
                        className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${config.useCustomSize ? 'bg-indigo-600' : 'bg-slate-700'}`}
                    >
                        <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 shadow-sm ${config.useCustomSize ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                </div>

                {config.useCustomSize && (
                    <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div>
                            <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Largura (px)</label>
                            <input 
                                type="number"
                                min="1"
                                value={config.customWidth}
                                onChange={(e) => onConfigChange({ ...config, customWidth: parseInt(e.target.value) || 1 })}
                                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Altura (px)</label>
                            <input 
                                type="number"
                                min="1"
                                value={config.customHeight}
                                onChange={(e) => onConfigChange({ ...config, customHeight: parseInt(e.target.value) || 1 })}
                                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Controls per mode */}
        {config.mode === 'grid' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-300">Colunas (X)</label>
                <input 
                  type="number" 
                  min="1" 
                  max={Math.max(1, image.originalWidth)}
                  value={config.cols}
                  onChange={(e) => onConfigChange({...config, cols: Math.max(1, parseInt(e.target.value) || 1)})}
                  className="w-16 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-right text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <input
                type="range"
                min="1"
                max={24}
                step="1"
                value={config.cols}
                onChange={(e) => onConfigChange({...config, cols: parseInt(e.target.value)})}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-300">Linhas (Y)</label>
                <input 
                  type="number" 
                  min="1" 
                  max={Math.max(1, image.originalHeight)}
                  value={config.rows}
                  onChange={(e) => onConfigChange({...config, rows: Math.max(1, parseInt(e.target.value) || 1)})}
                  className="w-16 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-right text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <input
                type="range"
                min="1"
                max={24}
                step="1"
                value={config.rows}
                onChange={(e) => onConfigChange({...config, rows: parseInt(e.target.value)})}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>
        )}

        {config.mode === 'smart' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Wand2 className="w-5 h-5 text-indigo-400 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-indigo-300">Detecção Automática</h4>
                  <p className="text-xs text-indigo-200/70 mt-1">
                    Este modo identifica automaticamente as "ilhas" de pixels não transparentes. Ideal para spritesheets irregulares.
                  </p>
                </div>
              </div>
            </div>
             <p className="text-xs text-slate-500 italic text-center">
              * A detecção roda automaticamente.
            </p>
          </div>
        )}

        {config.mode === 'manual' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Lasso className="w-5 h-5 text-indigo-400 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-indigo-300">Laço (Desenho Livre)</h4>
                  <ul className="text-xs text-indigo-200/70 mt-1 list-disc pl-4 space-y-1">
                    <li>Desenhe livremente ao redor do personagem.</li>
                    <li>Ao soltar, criaremos a caixa automaticamente.</li>
                    <li>Clique com botão direito para remover.</li>
                  </ul>
                </div>
              </div>
            </div>

            <button 
              onClick={onClearManual}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg transition-colors text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Limpar Seleções
            </button>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-slate-700 bg-slate-800/50 mt-auto">
        <button
          onClick={handleDownload}
          disabled={isZipping || isProcessing || processedFrames.length === 0}
          className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold text-white transition-all shadow-lg
            ${(isZipping || isProcessing) 
              ? 'bg-slate-600 cursor-not-allowed opacity-75' 
              : 'bg-indigo-600 hover:bg-indigo-500 hover:shadow-indigo-500/20 active:transform active:scale-95'}
          `}
        >
          {isZipping ? (
            <span className="animate-pulse">Gerando ZIP...</span>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Baixar Frames (.zip)
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Controls;