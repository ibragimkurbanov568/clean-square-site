import { useRef, useState } from 'react';
import { apiUpload } from '../../lib/apiClient';
import { useToast } from '../../hooks/useToast';
import Avatar from './Avatar';
import ImageCropModal from './ImageCropModal';
import Spinner from './Spinner';

export interface AvatarUploaderProps {
  name: string;
  avatarUrl: string | null;
  uploadPath: '/uploads/avatar';
  size?: 96 | 128;
  onUploaded: (url: string) => void;
}

/**
 * Редактируемый аватар (docs/03-design-system.md §7.8): камера видна на touch всегда, на
 * десктопе — по hover; клик открывает Cropper.js, после сохранения — загрузка в R2 через API.
 */
export function AvatarUploader({ name, avatarUrl, uploadPath, size = 96, onUploaded }: AvatarUploaderProps) {
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
      showToast('Аватар обновлён', 'success');
    } catch {
      showToast('Не удалось сохранить изменения. Попробуйте снова', 'error');
    } finally {
      setIsUploading(false);
      setPendingFile(null);
    }
  };

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <Avatar src={avatarUrl} name={name} size={size} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label="Изменить аватар"
        className="focus-ring absolute inset-x-0 bottom-0 flex h-1/3 items-center justify-center rounded-b-full bg-black/45 text-white opacity-100 transition-opacity sm:opacity-0 sm:hover:opacity-100 sm:focus-visible:opacity-100"
        style={{ borderBottomLeftRadius: 9999, borderBottomRightRadius: 9999 }}
      >
        {isUploading ? (
          <Spinner size={18} />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 8h3l1.5-2h7L17 8h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="14" r="3.2" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        )}
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
      <ImageCropModal
        isOpen={Boolean(pendingFile)}
        file={pendingFile}
        title="Обрезать аватар"
        aspectRatio={1}
        outputSize={{ width: 512, height: 512 }}
        onClose={() => setPendingFile(null)}
        onConfirm={handleConfirm}
      />
    </div>
  );
}

export default AvatarUploader;
