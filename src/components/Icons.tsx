import type { SVGProps } from "react";

/**
 * Набор инлайновых SVG-иконок интерфейса редактора. Без внешней
 * библиотеки иконок (её нет в зафиксированном стеке, см.
 * docs/04-architecture.md, §1). Все иконки — `aria-hidden`, подпись для
 * скринридера всегда идёт на самой кнопке через `aria-label`.
 */
type IconProps = SVGProps<SVGSVGElement>;

const base = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function IconBack(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

export function IconPencil(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function IconEye(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconEyeOff(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.68 19.68 0 0 1 5.06-6.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a19.6 19.6 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <path d="M1 1l22 22" />
    </svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconChevronUp(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M18 15l-6-6-6 6" />
    </svg>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function IconDragHandle(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="6" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="15" cy="6" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="9" cy="18" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="15" cy="18" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

export function IconDownload(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

/** Иконка типа секции по общему ключу словаря (SectionTypeDefinition.icon). */
export function SectionTypeIcon({ name, ...rest }: { name: string } & IconProps) {
  switch (name) {
    case "hero":
      return (
        <svg {...base} {...rest}>
          <rect x="3" y="4" width="18" height="12" rx="1" />
          <path d="M7 20h10M12 16v4" />
        </svg>
      );
    case "about":
      return (
        <svg {...base} {...rest}>
          <circle cx="12" cy="8" r="3" />
          <path d="M5 21a7 7 0 0 1 14 0" />
        </svg>
      );
    case "services":
      return (
        <svg {...base} {...rest}>
          <path d="M14.7 6.3a4 4 0 1 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4Z" />
        </svg>
      );
    case "features":
      return (
        <svg {...base} {...rest}>
          <path d="M12 2l2.9 6.3L21 9l-5 4.6L17.4 21 12 17.6 6.6 21 8 13.6 3 9l6.1-.7Z" />
        </svg>
      );
    case "pricing":
      return (
        <svg {...base} {...rest}>
          <path d="M12 1v22" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    case "testimonials":
      return (
        <svg {...base} {...rest}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
        </svg>
      );
    case "gallery":
      return (
        <svg {...base} {...rest}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      );
    case "cta":
      return (
        <svg {...base} {...rest}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9 12h6M12 9l3 3-3 3" />
        </svg>
      );
    case "contacts":
      return (
        <svg {...base} {...rest}>
          <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.4 2.1L8 9.9a16 16 0 0 0 6 6l1.4-1.4a2 2 0 0 1 2.1-.4c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.8 2.2Z" />
        </svg>
      );
    case "footer":
      return (
        <svg {...base} {...rest}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 15h18" />
        </svg>
      );
    default:
      return (
        <svg {...base} {...rest}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
        </svg>
      );
  }
}
