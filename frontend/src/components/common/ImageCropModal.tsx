import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import { useEffect, useRef, useState } from 'react';
import Button from './Button';
import Modal from './Modal';

export interface ImageCropModalProps {
  isOpen: boolean;
  file: File | null;
  title: string;
  aspectRatio?: number;
  outputSize?: { width: number; height: number };
  onClose: () => void;
  onConfirm: (blob: Blob) => Promise<void> | void;
}

/**
 * Обрезка изображения перед загрузкой — Cropper.js v1 (допущение 13 ТЗ,
 * docs/03-design-system.md §7.8). Используется для аватара (1:1) и обложки/обоев (16:9).
 */
export function ImageCropModal({
  isOpen,
  file,
  title,
  aspectRatio = 1,
  outputSize,
  onClose,
  onConfirm,
}: ImageCropModalProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const cropperRef = useRef<Cropper | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!file) {
      setImageUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!isOpen || !imageUrl || !imageRef.current) return undefined;
    const cropper = new Cropper(imageRef.current, {
      aspectRatio,
      viewMode: 1,
      dragMode: 'move',
      autoCropArea: 1,
      background: false,
      responsive: true,
    });
    cropperRef.current = cropper;
    return () => {
      cropper.destroy();
      cropperRef.current = null;
    };
  }, [isOpen, imageUrl, aspectRatio]);

  const handleConfirm = () => {
    const cropper = cropperRef.current;
    if (!cropper) return;
    setIsSaving(true);
    const size = outputSize ?? { width: 512, height: Math.round(512 / aspectRatio) };
    cropper.getCroppedCanvas(size).toBlob(
      (blob) => {
        setIsSaving(false);
        if (blob) void onConfirm(blob);
      },
      'image/jpeg',
      0.9,
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Отмена
          </Button>
          <Button variant="primary" onClick={handleConfirm} isLoading={isSaving} loadingText="Сохраняем…">
            Сохранить
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-text-secondary">Перетащите и обрежьте изображение перед сохранением</p>
      <div className="max-h-[420px] overflow-hidden rounded-md bg-surface-hover">
        {imageUrl ? <img ref={imageRef} src={imageUrl} alt="" className="block max-w-full" /> : null}
      </div>
    </Modal>
  );
}

export default ImageCropModal;
