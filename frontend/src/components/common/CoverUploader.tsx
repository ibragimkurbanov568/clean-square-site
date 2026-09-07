import { useRef, useState } from 'react';
import { apiUpload } from '../../lib/apiClient';
import { useToast } from '../../hooks/useToast';
import Button from './Button';
import ImageCropModal from './ImageCropModal';

export interface CoverUploaderProps {
  coverUrl: string | null;
  uploadPath: '/uploads/cover' | '/uploads/wallpaper';
  label: string;
  onUploaded: (url: string) => void;
}

/** Загрузка обложки компании/обоев кабинета с обрезкой Cropper.js (16:9). */
export function CoverUploader({ coverUrl, uploadPath, label, onUploaded }: CoverUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { showToast } = useToast();

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setPendingFile(file);
    event.target.value = '';
  };

  const handleConfirm = async (blob: Blob) => {
    setIsUploading(true);
    try {
      const result = await apiUpload<{ url: string }>(uploadPath, blob, 'file');
      onUploaded(result.url);
      showToast('Изображение сохранено', 'success');
    } catch {
      showToast('Не удалось сохранить изменения. Попробуйте снова', 'error');
    } finally {
      setIsUploading(false);
      setPendingFile(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-surface-hover">
        {coverUrl ? (
          <img src={coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" style={{ background: 'var(--gradient-hero)' }} />
        )}
      </div>
      <Button variant="secondary" size="sm" isLoading={isUploading} loadingText="Загружаем…" onClick={() => inputRef.current?.click()}>
        {label}
      </Button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
      <ImageCropModal
        isOpen={Boolean(pendingFile)}
        file={pendingFile}
        title="Обрезать изображение"
        aspectRatio={16 / 9}
        outputSize={{ width: 1200, height: 675 }}
        onClose={() => setPendingFile(null)}
        onConfirm={handleConfirm}
      />
    </div>
  );
}

export default CoverUploader;
