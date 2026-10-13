import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import {
  isValidDriveId,
  isValidYouTubeId,
  isValidHttpsUrl,
  getDriveThumbnailUrl,
  getDriveFallbackThumbnailUrl,
  getDriveLightboxUrl,
  getYouTubePosterUrl,
  getDrivePreviewUrl,
  getYouTubeEmbedUrl,
  sanitizeVideoPlayerUrl,
} from './drive-url';

describe('drive-url utilities', () => {
  let sanitizer: DomSanitizer;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    sanitizer = TestBed.inject(DomSanitizer);
  });

  it('should validate drive IDs correctly', () => {
    expect(isValidDriveId('1ABC_xyz-12345')).toBeTrue();
    expect(isValidDriveId('short')).toBeFalse();
    expect(isValidDriveId('invalid id with spaces')).toBeFalse();
    expect(isValidDriveId('')).toBeFalse();
  });

  it('should validate YouTube IDs correctly', () => {
    expect(isValidYouTubeId('dQw4w9WgXcQ')).toBeTrue();
    expect(isValidYouTubeId('tooLongId123456')).toBeFalse();
    expect(isValidYouTubeId('tooShort')).toBeFalse();
    expect(isValidYouTubeId('invalid!char')).toBeFalse();
  });

  it('should validate HTTPS URLs', () => {
    expect(isValidHttpsUrl('https://example.com/logo.png')).toBeTrue();
    expect(isValidHttpsUrl('http://insecure.com/logo.png')).toBeFalse();
    expect(isValidHttpsUrl('javascript:alert(1)')).toBeFalse();
    expect(isValidHttpsUrl('')).toBeFalse();
  });

  it('should generate correct Drive and YouTube URLs', () => {
    const driveId = '1ABC_xyz-12345';
    const ytId = 'dQw4w9WgXcQ';

    expect(getDriveThumbnailUrl(driveId, 800)).toBe(
      `https://drive.google.com/thumbnail?id=${driveId}&sz=w800`
    );
    expect(getDriveFallbackThumbnailUrl(driveId, 800)).toBe(
      `https://lh3.googleusercontent.com/d/${driveId}=w800`
    );
    expect(getDriveLightboxUrl(driveId)).toBe(
      `https://drive.google.com/thumbnail?id=${driveId}&sz=w1600`
    );
    expect(getYouTubePosterUrl(ytId)).toBe(
      `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
    );
    expect(getDrivePreviewUrl(driveId)).toBe(
      `https://drive.google.com/file/d/${driveId}/preview`
    );
    expect(getYouTubeEmbedUrl(ytId)).toBe(
      `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0`
    );
  });

  it('should sanitize video URLs safely and reject invalid IDs', () => {
    const driveSafe = sanitizeVideoPlayerUrl(sanitizer, 'drive', '1ABC_xyz-12345');
    expect(driveSafe).toBeTruthy();

    const ytSafe = sanitizeVideoPlayerUrl(sanitizer, 'youtube', 'dQw4w9WgXcQ');
    expect(ytSafe).toBeTruthy();

    const invalidDrive = sanitizeVideoPlayerUrl(sanitizer, 'drive', 'short');
    expect(invalidDrive).toBeNull();

    const invalidYt = sanitizeVideoPlayerUrl(sanitizer, 'youtube', 'bad_id');
    expect(invalidYt).toBeNull();
  });
});
