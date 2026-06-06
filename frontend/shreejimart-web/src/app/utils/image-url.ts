import { environment } from '../../environments/environment';

export function resolveImageUrl(imageUrl?: string | null): string | null {
  if (!imageUrl?.trim()) return null;
  const url = imageUrl.trim();
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = environment.apiBaseUrl.replace(/\/+$/, '');
  return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
}
