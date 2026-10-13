import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MediaVideo } from '../../../../core/models/profile.model';
import {
  getDriveThumbnailUrl,
  getYouTubePosterUrl,
  sanitizeVideoPlayerUrl,
} from '../../../../core/utils/drive-url';

@Component({
  selector: 'app-video-card',
  standalone: true,
  templateUrl: './video-card.component.html',
  styleUrls: ['./video-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VideoCardComponent {
  private readonly sanitizer = inject(DomSanitizer);

  readonly video = input.required<MediaVideo>();

  protected readonly isPlaying = signal(false);
  protected readonly posterFailed = signal(false);

  protected readonly posterUrl = computed<string>(() => {
    if (this.posterFailed()) return '';
    const v = this.video();
    if (v.source === 'youtube') {
      return getYouTubePosterUrl(v.id);
    }
    if (v.source === 'drive') {
      return getDriveThumbnailUrl(v.id, 800);
    }
    return '';
  });

  protected readonly safePlayerUrl = computed<SafeResourceUrl | null>(() => {
    if (!this.isPlaying()) return null;
    const v = this.video();
    return sanitizeVideoPlayerUrl(this.sanitizer, v.source, v.id);
  });

  protected readonly videoTitle = computed<string>(() => {
    const v = this.video();
    return v.name || (v.source === 'youtube' ? 'YouTube video' : 'Company video');
  });

  play(): void {
    this.isPlaying.set(true);
  }

  onPosterError(): void {
    this.posterFailed.set(true);
  }
}
