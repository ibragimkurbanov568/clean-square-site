import { useEffect } from 'react';

export interface DocumentMetaInput {
  title: string;
  description?: string;
}

function setMetaTag(nameOrProperty: 'name' | 'property', key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${nameOrProperty}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(nameOrProperty, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

/**
 * Базовые SEO/предпросмотровые мета-теги на клиенте (допущение из docs/01-spec.md — без SSR,
 * "react-helmet-подобный подход"). Восстанавливает исходный title/description при размонтировании,
 * чтобы переход на другой экран не оставлял устаревшие теги карточки компании.
 */
export function useDocumentMeta({ title, description }: DocumentMetaInput) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;
    if (description) {
      setMetaTag('name', 'description', description);
      setMetaTag('property', 'og:title', title);
      setMetaTag('property', 'og:description', description);
      setMetaTag('name', 'twitter:title', title);
      setMetaTag('name', 'twitter:description', description);
    }
    return () => {
      document.title = previousTitle;
    };
  }, [title, description]);
}
