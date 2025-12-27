import React, { useEffect, useRef, useState } from 'react';
import { UploadedImage, Rect, Color } from '../types';

interface ImageEditorProps {
  image: UploadedImage;
  rects: Rect[];
  mode: 'grid' | 'smart' | 'manual';
  isWandMode: boolean;
  onAddManualRect?: (rect: Rect) => void;
  onRemoveManualRect?: (rectIndex: number) => void;
  onWandSelect?: (x: number, y: number) => void;
  selectionMask?: Uint8Array | null;
}

interface Point {
  x: number;
  y: number;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ 
  image, 
  rects, 
  mode,
  isWandMode,
  onAddManualRect,
  onRemoveManualRect,
  onWandSelect,
  selectionMask
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null); // Store loaded image
  
  // Drawing State
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);

  // Load Image once
  useEffect(() => {
    const img = new Image();
    img.src = image.src;
    img.onload = () => {
      imgRef.current = img;
      renderCanvas();
    };
  }, [image.src]);

  // Redraw when props change
  useEffect(() => {
    renderCanvas();
  }, [rects, mode, isDrawing, currentPath, isWandMode, selectionMask]);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !containerRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Logic to fit image in container
    canvas.width = img.width;
    canvas.height = img.height;

    // Draw Image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    // Draw Selection Mask (Blue Tint)
    if (selectionMask) {
        const maskImageData = ctx.createImageData(canvas.width, canvas.height);
        const data = maskImageData.data;
        for (let i = 0; i < selectionMask.length; i++) {
            if (selectionMask[i] === 1) {
                const idx = i * 4;
                // Tint blue: R=0, G=100, B=255, A=100
                data[idx] = 0;
                data[idx+1] = 100;
                data[idx+2] = 255;
                data[idx+3] = 100; // Semi-transparent
            }
        }
        
        // Use a temporary canvas to draw the overlay so we don't overwrite image pixels incorrectly
        // Actually putImageData replaces pixels. We want to overlay.
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
            tempCtx.putImageData(maskImageData, 0, 0);
            ctx.save();
            ctx.globalAlpha = 0.6; // Additional opacity control
            ctx.drawImage(tempCanvas, 0, 0);
            ctx.restore();
        }
    }

    // Draw Overlay Rects
    ctx.lineWidth = 2;
    
    // Draw existing rects
    rects.forEach((rect, i) => {
      // Different styles for different modes
      let strokeColor = '#ef4444'; // default red
      let fillColor = 'rgba(255, 255, 255, 0.1)';
      let isDashed = true;

      if (mode === 'smart') {
        strokeColor = '#818cf8'; // indigo
        fillColor = 'rgba(99, 102, 241, 0.2)';
        isDashed = false;
      } else if (mode === 'manual') {
        strokeColor = '#10b981'; // emerald
        fillColor = 'rgba(16, 185, 129, 0.2)';
        isDashed = false;
      }

      ctx.strokeStyle = strokeColor;
      
      // If it has a path (freehand lasso), draw the path shape
      if (rect.path && rect.path.length > 0) {
        ctx.beginPath();
        ctx.setLineDash([]); 
        rect.path.forEach((p, idx) => {
            if (idx === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.stroke();
        
        // Also draw dashed bounding box for reference (lighter)
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.setLineDash([2, 4]);
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
        ctx.restore();

      } else {
        // Standard rectangle drawing (Grid/Smart without path)
        ctx.fillStyle = fillColor;
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        ctx.setLineDash(isDashed ? [5, 5] : []); 
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
      }
      
      // Draw ID
      if (rect.width > 20 && rect.height > 20) {
        ctx.font = "12px sans-serif";
        ctx.fillStyle = "white";
        ctx.shadowColor = "black";
        ctx.shadowBlur = 3;
        ctx.fillText(`#${i}`, rect.x + 2, rect.y + 12);
      }
    });

    // Draw currently drawing path (Lasso / Freehand)
    if (mode === 'manual' && isDrawing && currentPath.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = '#10b981'; // Emerald
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      
      ctx.moveTo(currentPath[0].x, currentPath[0].y);
      for(let i = 1; i < currentPath.length; i++) {
        ctx.lineTo(currentPath[i].x, currentPath[i].y);
      }
      ctx.stroke();

      // Optional: Fill slightly
      ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
      ctx.fill();
    }
  };

  const getCanvasCoords = (e: React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (e.button !== 0) return; // Only Left Click

    // 1. Wand Selection Logic
    if (isWandMode && onWandSelect) {
        const coords = getCanvasCoords(e);
        onWandSelect(Math.floor(coords.x), Math.floor(coords.y));
        return; 
    }

    // 2. Manual Drawing Logic
    if (mode === 'manual' && !isWandMode) {
        const coords = getCanvasCoords(e);
        setCurrentPath([coords]);
        setIsDrawing(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isWandMode) return;

    if (!isDrawing || mode !== 'manual') return;
    
    // Add point to path
    const coords = getCanvasCoords(e);
    setCurrentPath(prev => [...prev, coords]);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isWandMode) return;

    if (!isDrawing || mode !== 'manual') return;
    setIsDrawing(false);

    if (currentPath.length < 3) {
        // Too small, ignore
        setCurrentPath([]);
        return;
    }

    // Calculate Bounding Box of the drawn path
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    currentPath.forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    });

    // Add padding (optional) or keep strict
    const rect: Rect = {
        x: Math.floor(minX),
        y: Math.floor(minY),
        width: Math.ceil(maxX - minX),
        height: Math.ceil(maxY - minY),
        path: [...currentPath] // Save the path coordinates!
    };

    // Minimum size filter
    if (rect.width > 2 && rect.height > 2 && onAddManualRect) {
      onAddManualRect(rect);
    }
    
    setCurrentPath([]);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isWandMode) {
        e.preventDefault(); 
        return; 
    }

    if (mode !== 'manual' || !onRemoveManualRect) return;
    e.preventDefault(); // Prevent browser menu

    const coords = getCanvasCoords(e);
    
    // Find rect under mouse (iterate backwards to get top-most)
    for (let i = rects.length - 1; i >= 0; i--) {
      const r = rects[i];
      if (
        coords.x >= r.x && 
        coords.x <= r.x + r.width && 
        coords.y >= r.y && 
        coords.y <= r.y + r.height
      ) {
        onRemoveManualRect(i);
        break; // Remove only one
      }
    }
  };

  // Dynamic cursor style
  let cursorClass = 'cursor-default';
  if (isWandMode) cursorClass = 'cursor-pointer'; // Can use a wand icon if available via CSS
  else if (mode === 'manual') cursorClass = 'cursor-crosshair';

  return (
    <div ref={containerRef} className="w-full bg-slate-900/50 rounded-xl overflow-hidden border border-slate-700 relative select-none">
        <div className="absolute top-2 right-2 z-10 bg-black/70 text-xs text-white px-2 py-1 rounded backdrop-blur-md pointer-events-none transition-all">
            {isWandMode && <span className="text-indigo-400 font-bold">Modo Varinha: Selecione uma área</span>}
            {!isWandMode && mode === 'smart' && 'Detecção Automática (Lasso)'}
            {!isWandMode && mode === 'grid' && 'Visualização da Grade'}
            {!isWandMode && mode === 'manual' && 'Laço Livre (Desenhe e Solte)'}
        </div>
        <canvas 
          ref={canvasRef} 
          className={`block mx-auto max-w-full h-auto ${cursorClass}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onContextMenu={handleContextMenu}
          onMouseLeave={() => setIsDrawing(false)}
        />
    </div>
  );
};

export default ImageEditor;