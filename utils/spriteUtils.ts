import { ProcessedFrame, Rect, Color } from '../types';

/**
 * Loads an image from a source URL.
 */
export const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
};

/**
 * Helper to get the top-left pixel color of the image, assumed to be the background.
 */
const getBackgroundColor = (img: HTMLImageElement) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if(!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0,0,1,1).data;
    return { r: data[0], g: data[1], b: data[2] };
}

/**
 * Helper to remove a specific background color from a canvas context.
 */
const removeBackgroundFromContext = (
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number, 
    bgColor: {r: number, g: number, b: number}
) => {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const { r: br, g: bg, b: bb } = bgColor;
    const tolerance = 30; // Tolerance for JPEG artifacts

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        if (a === 0) continue; // Skip already transparent pixels

        // Calculate simple distance
        const diff = Math.abs(r - br) + Math.abs(g - bg) + Math.abs(b - bb);

        if (diff <= tolerance) {
            data[i + 3] = 0; // Make transparent
        }
    }
    ctx.putImageData(imgData, 0, 0);
};

/**
 * Performs a flood fill to find connected pixels of similar color.
 * Returns a Uint8Array mask where 1 = selected, 0 = not selected.
 */
export const performFloodFill = (
    img: HTMLImageElement, 
    startX: number, 
    startY: number, 
    tolerance: number = 30
): Uint8Array | null => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;
    
    // Check bounds
    if (startX < 0 || startX >= width || startY < 0 || startY >= height) return null;

    const mask = new Uint8Array(width * height);
    const visited = new Uint8Array(width * height);
    
    const startIdx = (Math.floor(startY) * width + Math.floor(startX)) * 4;
    const startR = data[startIdx];
    const startG = data[startIdx + 1];
    const startB = data[startIdx + 2];
    const startA = data[startIdx + 3];

    // If clicking on transparent pixel, no op.
    if (startA === 0) return null;

    const queue = [Math.floor(startY) * width + Math.floor(startX)];
    visited[Math.floor(startY) * width + Math.floor(startX)] = 1;
    mask[Math.floor(startY) * width + Math.floor(startX)] = 1;

    while (queue.length > 0) {
        const idx = queue.pop()!;
        const x = idx % width;
        const y = Math.floor(idx / width);

        const neighbors = [
            {nx: x + 1, ny: y},
            {nx: x - 1, ny: y},
            {nx: x, ny: y + 1},
            {nx: x, ny: y - 1}
        ];

        for (const {nx, ny} of neighbors) {
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nIdx = ny * width + nx;
                if (!visited[nIdx]) {
                    const pixelIdx = nIdx * 4;
                    const r = data[pixelIdx];
                    const g = data[pixelIdx + 1];
                    const b = data[pixelIdx + 2];
                    const a = data[pixelIdx + 3];

                    // Match color
                    const diff = Math.abs(r - startR) + Math.abs(g - startG) + Math.abs(b - startB);
                    
                    if (a > 0 && diff <= tolerance) {
                        visited[nIdx] = 1;
                        mask[nIdx] = 1;
                        queue.push(nIdx);
                    }
                }
            }
        }
    }

    return mask;
};

/**
 * Applies a mask to an image, making selected pixels transparent.
 * Returns the new image as a Data URL.
 */
export const applyTransparency = (
    img: HTMLImageElement,
    mask: Uint8Array
): string => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return img.src; // Fail safe

    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < mask.length; i++) {
        if (mask[i] === 1) {
            data[i * 4 + 3] = 0; // Set Alpha to 0
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
};

/**
 * Scans the image for non-transparent islands of pixels to auto-detect sprites.
 */
export const detectSprites = (img: HTMLImageElement): Rect[] => {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;

  const visited = new Uint8Array(width * height);
  const rects: Rect[] = [];

  // Threshold for transparency (0-255)
  const alphaThreshold = 10; 

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (visited[idx]) continue;

      const alpha = data[idx * 4 + 3];
      if (alpha > alphaThreshold) {
        // Found a new sprite island, perform BFS/FloodFill
        let minX = x, maxX = x, minY = y, maxY = y;
        const queue = [idx];
        visited[idx] = 1;

        while (queue.length > 0) {
          const currIdx = queue.pop()!;
          const currX = currIdx % width;
          const currY = Math.floor(currIdx / width);

          if (currX < minX) minX = currX;
          if (currX > maxX) maxX = currX;
          if (currY < minY) minY = currY;
          if (currY > maxY) maxY = currY;

          // Check neighbors (4-connectivity)
          const neighbors = [
            { nx: currX + 1, ny: currY },
            { nx: currX - 1, ny: currY },
            { nx: currX, ny: currY + 1 },
            { nx: currX, ny: currY - 1 }
          ];

          for (const { nx, ny } of neighbors) {
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIdx = ny * width + nx;
              if (!visited[nIdx]) {
                const nAlpha = data[nIdx * 4 + 3];
                if (nAlpha > alphaThreshold) {
                  visited[nIdx] = 1;
                  queue.push(nIdx);
                }
              }
            }
          }
        }

        // Add padding margin (1px) to ensure we don't clip anti-aliasing
        rects.push({
          x: Math.max(0, minX),
          y: Math.max(0, minY),
          width: Math.min(width - minX, maxX - minX + 1),
          height: Math.min(height - minY, maxY - minY + 1)
        });
      }
    }
  }

  // Sort rects (reading order: top-left to bottom-right)
  return rects.sort((a, b) => {
    const rowDiff = a.y - b.y;
    if (Math.abs(rowDiff) > 10) return rowDiff; // Different rows
    return a.x - b.x; // Same row, sort by X
  });
};

/**
 * Slices an image based on explicit rectangles.
 * Implements "Uniform Size" strategy.
 * Implements "Polygon Masking" (Lasso).
 * Implements "Background Removal" (Color Keying).
 * Implements "Custom Output Dimensions" with Aspect Ratio scaling.
 */
export const sliceFromRects = async (
  imageSrc: string,
  rects: Rect[],
  removeBackground: boolean = false,
  backgroundColor: Color | null = null,
  customSize?: { width: number, height: number }
): Promise<ProcessedFrame[]> => {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  if (!ctx) throw new Error('No canvas context');

  // Determine Background Color if needed
  let bgColor: {r: number, g: number, b: number} | null = null;
  if (removeBackground) {
      if (backgroundColor) {
          bgColor = backgroundColor;
      } else {
          bgColor = getBackgroundColor(img);
      }
  }

  // 1. Determine Uniform Size
  // If customSize is provided, use it. Otherwise, calculate max.
  let finalWidth = 0;
  let finalHeight = 0;

  if (customSize) {
    finalWidth = customSize.width;
    finalHeight = customSize.height;
  } else {
    rects.forEach(rect => {
      if (rect.width > finalWidth) finalWidth = rect.width;
      if (rect.height > finalHeight) finalHeight = rect.height;
    });
    // Ensure we have at least 1px
    finalWidth = Math.max(1, finalWidth);
    finalHeight = Math.max(1, finalHeight);
  }

  const frames: ProcessedFrame[] = [];

  rects.forEach((rect, index) => {
    // Set canvas to uniform size
    canvas.width = finalWidth;
    canvas.height = finalHeight;
    ctx.clearRect(0, 0, finalWidth, finalHeight);

    // Scaling Logic: Fits the rect inside the final dimensions while maintaining aspect ratio
    let scale = 1;
    if (customSize) {
      const scaleX = finalWidth / rect.width;
      const scaleY = finalHeight / rect.height;
      scale = Math.min(scaleX, scaleY);
    }

    const drawWidth = rect.width * scale;
    const drawHeight = rect.height * scale;

    // Calculate position to center the sprite
    const destX = (finalWidth - drawWidth) / 2;
    const destY = (finalHeight - drawHeight) / 2;

    ctx.save();

    // 2. Apply Polygon Masking (Lasso)
    if (rect.path && rect.path.length > 0) {
      ctx.beginPath();
      rect.path.forEach((p, i) => {
        // Map absolute image coordinates to relative coordinates
        const relativeX = p.x - rect.x;
        const relativeY = p.y - rect.y;

        // Apply scale and offset to map to canvas
        const localX = (relativeX * scale) + destX;
        const localY = (relativeY * scale) + destY;
        
        if (i === 0) ctx.moveTo(localX, localY);
        else ctx.lineTo(localX, localY);
      });
      ctx.closePath();
      ctx.clip(); 
    }

    // 3. Draw the sprite (Centered and Scaled)
    // We disable image smoothing for pixel art look if needed, but keeping default for now
    ctx.drawImage(
      img,
      rect.x, rect.y, rect.width, rect.height, // Source crop
      destX, destY, drawWidth, drawHeight      // Destination (scaled)
    );

    ctx.restore();

    // 4. Remove Background if enabled
    if (removeBackground && bgColor) {
        removeBackgroundFromContext(ctx, finalWidth, finalHeight, bgColor);
    }

    frames.push({
      id: index,
      dataUrl: canvas.toDataURL('image/png'),
      width: finalWidth,
      height: finalHeight,
      sourceRect: rect
    });
  });

  return frames;
};

/**
 * Slices an image into frames based on rows and columns (Legacy Grid Mode).
 * Supports Custom Output Size with Aspect Ratio scaling.
 */
export const sliceSpritesheet = async (
  imageSrc: string,
  rows: number,
  cols: number,
  removeBackground: boolean = false,
  backgroundColor: Color | null = null,
  customSize?: { width: number, height: number }
): Promise<ProcessedFrame[]> => {
  const img = await loadImage(imageSrc);
  const frames: ProcessedFrame[] = [];

  const gridFrameWidth = Math.floor(img.width / cols);
  const gridFrameHeight = Math.floor(img.height / rows);

  if (gridFrameWidth === 0 || gridFrameHeight === 0) return [];

  // Determine actual output size
  const finalWidth = customSize ? customSize.width : gridFrameWidth;
  const finalHeight = customSize ? customSize.height : gridFrameHeight;

  const canvas = document.createElement('canvas');
  canvas.width = finalWidth;
  canvas.height = finalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) throw new Error('No canvas context');

  // Determine Background Color if needed
  let bgColor: {r: number, g: number, b: number} | null = null;
  if (removeBackground) {
      if (backgroundColor) {
          bgColor = backgroundColor;
      } else {
          bgColor = getBackgroundColor(img);
      }
  }

  let frameId = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.clearRect(0, 0, finalWidth, finalHeight);
      
      const srcX = c * gridFrameWidth;
      const srcY = r * gridFrameHeight;

      // Scaling Logic
      let scale = 1;
      if (customSize) {
        const scaleX = finalWidth / gridFrameWidth;
        const scaleY = finalHeight / gridFrameHeight;
        scale = Math.min(scaleX, scaleY);
      }

      const drawWidth = gridFrameWidth * scale;
      const drawHeight = gridFrameHeight * scale;

      // Center the grid cell in the output canvas
      const destX = (finalWidth - drawWidth) / 2;
      const destY = (finalHeight - drawHeight) / 2;

      ctx.drawImage(
        img,
        srcX, srcY, gridFrameWidth, gridFrameHeight,
        destX, destY, drawWidth, drawHeight
      );

      // Remove Background if enabled
      if (removeBackground && bgColor) {
        removeBackgroundFromContext(ctx, finalWidth, finalHeight, bgColor);
      }

      frames.push({
        id: frameId++,
        dataUrl: canvas.toDataURL('image/png'),
        width: finalWidth,
        height: finalHeight,
        sourceRect: { x: srcX, y: srcY, width: gridFrameWidth, height: gridFrameHeight }
      });
    }
  }

  return frames;
};