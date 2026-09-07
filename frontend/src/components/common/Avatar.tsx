import { cn, getInitials } from '../../lib/utils';

export interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 32 | 48 | 96 | 128;
  className?: string;
}

/** Аватар — docs/03-design-system.md §7.8. Плейсхолдер с инициалами при отсутствии фото. */
export function Avatar({ src, name, size = 48, className }: AvatarProps) {
  const fontSize = Math.round(size * 0.4);

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={cn('rounded-full object-cover', className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={cn('flex shrink-0 items-center justify-center rounded-full bg-accent-subtle font-semibold text-text-primary', className)}
      style={{ width: size, height: size, fontSize }}
      aria-hidden="true"
    >
      {getInitials(name)}
    </div>
  );
}

export default Avatar;
