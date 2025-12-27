import React, { useRef, useState } from 'react';
import { Upload, FileImage, AlertCircle } from 'lucide-react';
import { UploadedImage } from '../types';

interface SpriteUploaderProps {
  onImageUpload: (image: UploadedImage) => void;
}

const SpriteUploader: React.FC<SpriteUploaderProps> = ({ onImageUpload }) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (file: File) => {
    setError(null);
    if (!file.type.match('image/png') && !file.type.match('image/jpeg')) {
      setError('Por favor, envie apenas arquivos PNG ou JPG.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        onImageUpload({
          src: e.target?.result as string,
          file,
          originalWidth: img.width,
          originalHeight: img.height,
        });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className="w-full mb-6">
      <div 
        className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl transition-all duration-300 ease-in-out cursor-pointer overflow-hidden
          ${dragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-600 bg-slate-800/50 hover:bg-slate-800'}
          ${error ? 'border-red-500 bg-red-500/10' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/png, image/jpeg"
          onChange={handleChange}
        />

        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
          {error ? (
            <>
              <AlertCircle className="w-12 h-12 mb-3 text-red-500" />
              <p className="mb-2 text-sm text-red-400 font-semibold">{error}</p>
            </>
          ) : (
            <>
              <div className={`p-4 rounded-full mb-3 ${dragActive ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                <Upload className="w-8 h-8" />
              </div>
              <p className="mb-2 text-lg font-semibold text-slate-200">
                Clique para enviar ou arraste a imagem
              </p>
              <p className="text-sm text-slate-400">
                Suporta PNG e JPG (Spritesheets)
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpriteUploader;
