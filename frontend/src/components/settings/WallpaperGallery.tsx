import { useRef, useState } from 'react';
import Card from '../common/Card';
import ImageCropModal from '../common/ImageCropModal';
import Skeleton from '../common/Skeleton';
import { apiUpload } from '../../lib/apiClient';
import { useCabinetWallpaper } from '../../hooks/useCabinetWallpaper';
import { useToast } from '../../hooks/useToast';
import { useWallpapers } from '../../hooks/useWallpapers';
import { cn } from '../../lib/utils';

export function WallpaperGallery({ userId }: { userId: string | undefined }) {
  const { presets, isLoading } = useWallpapers();
  const { wallpaperUrl, setWallpaperUrl } = useCabinetWallpaper(userId);
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setPendingFile(file);
    event.target.value = '';
  };

  const handleConfirm = async (blob: Blob) => {
    setIsUploading(true);
    try {
      const result = await apiUpload<{ url: string }>('/uploads/wallpaper', blob, 'file');
      setWallpaperUrl(result.url);
      showToast('Фон кабинета обновлён', 'success');
    } catch {
      showToast('Не удалось сохранить изменения. Попробуйте снова', 'error');
    } finally {
      setIsUploading(false);
      setPendingFile(null);
    }
  };

  return (
    <Card>
      <h2 className="mb-2 text-lg font-semibold text-text-primary">Аватар и обложка</h2>
      <p className="mb-4 text-sm text-text-secondary">Выберите фон из галереи или загрузите своё фото</p>
      {isLoading ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setWallpaperUrl(preset)}
              className={cn(
                'focus-ring interactive-scale aspect-video overflow-hidden rounded-md border-2',
                wallpaperUrl === preset ? 'border-accent' : 'border-transparent',
              )}
            >
              <img src={preset} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="focus-ring interactive-scale flex aspect-video items-center justify-center rounded-md border border-dashed border-border-strong text-xs text-text-secondary hover:bg-surface-hover"
          >
            {isUploading ? 'Загружаем…' : 'Загрузить своё фото'}
          </button>
        </div>
      )}
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
    </Card>
  );
}

export default WallpaperGallery;
