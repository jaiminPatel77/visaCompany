import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

export const DRIVE_ID_REGEX = /^[A-Za-z0-9_-]{10,}$/;
export const YOUTUBE_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

export function isValidDriveId(id: string | null | undefined): boolean {
  if (!id || typeof id !== 'string') return false;
  return DRIVE_ID_REGEX.test(id.trim());
}

export function isValidYouTubeId(id: string | null | undefined): boolean {
  if (!id || typeof id !== 'string') return false;
  return YOUTUBE_ID_REGEX.test(id.trim());
}

export function isValidHttpsUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function getDriveThumbnailUrl(id: string, width = 800): string {
  if (!isValidDriveId(id)) return '';
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w${width}`;
}

export function getDriveFallbackThumbnailUrl(id: string, width = 800): string {
  if (!isValidDriveId(id)) return '';
  return `https://lh3.googleusercontent.com/d/${encodeURIComponent(id)}=w${width}`;
}

export function getDriveLightboxUrl(id: string): string {
  return getDriveThumbnailUrl(id, 1600);
}

export function getYouTubePosterUrl(id: string): string {
  if (!isValidYouTubeId(id)) return '';
  return `https://img.youtube.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;
}

export function getDrivePreviewUrl(id: string): string {
  if (!isValidDriveId(id)) return '';
  return `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`;
}

export function getYouTubeEmbedUrl(id: string): string {
  if (!isValidYouTubeId(id)) return '';
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
}

/**
 * Sanitizes video player embed URL with DomSanitizer.
 * ONLY called after strict regex ID validation, limited strictly to
 * drive.google.com and www.youtube-nocookie.com.
 */
export function sanitizeVideoPlayerUrl(
  sanitizer: DomSanitizer,
  source: 'drive' | 'youtube',
  id: string
): SafeResourceUrl | null {
  if (source === 'drive') {
    if (!isValidDriveId(id)) return null;
    const url = getDrivePreviewUrl(id);
    return sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  if (source === 'youtube') {
    if (!isValidYouTubeId(id)) return null;
    const url = getYouTubeEmbedUrl(id);
    return sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  return null;
}
