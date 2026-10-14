import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  input,
  OnDestroy,
  signal,
  ViewChild,
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
export class VideoCardComponent implements OnDestroy {
  private readonly sanitizer = inject(DomSanitizer);

  readonly video = input.required<MediaVideo>();
  readonly index = input<number>(0);
  readonly isFeatured = input<boolean>(false);

  @ViewChild('closeBtn') private readonly closeBtnRef?: ElementRef<HTMLButtonElement>;

  protected readonly isModalOpen = signal(false);
  protected readonly posterFailed = signal(false);

  private lastFocusedElement: HTMLElement | null = null;

  // Backwards compatibility for existing tests/references
  protected readonly isPlaying = computed(() => this.isModalOpen());

  protected readonly cleanTitle = computed<string>(() => {
    const v = this.video();
    if (v.name && v.name.trim()) {
      return v.name.trim().replace(/\.[a-zA-Z0-9]{2,4}$/, '');
    }
    return `Company Video ${this.index() + 1}`;
  });

  protected readonly videoTitle = computed<string>(() => this.cleanTitle());

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
    if (!this.isModalOpen()) return null;
    const v = this.video();
    return sanitizeVideoPlayerUrl(this.sanitizer, v.source, v.id);
  });

  openModal(): void {
    this.lastFocusedElement = document.activeElement as HTMLElement;
    this.isModalOpen.set(true);
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      this.closeBtnRef?.nativeElement.focus();
    }, 50);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    document.body.style.overflow = '';
    if (this.lastFocusedElement) {
      this.lastFocusedElement.focus();
      this.lastFocusedElement = null;
    }
  }

  // Alias for backward compatibility
  play(): void {
    this.openModal();
  }

  onPosterError(): void {
    this.posterFailed.set(true);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (this.isModalOpen() && event.key === 'Escape') {
      event.preventDefault();
      this.closeModal();
    }
  }

  onDialogKeydown(event: KeyboardEvent): void {
    if (event.key === 'Tab') {
      const dialog = event.currentTarget as HTMLElement;
      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), iframe'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  ngOnDestroy(): void {
    if (this.isModalOpen()) {
      document.body.style.overflow = '';
    }
  }
}
