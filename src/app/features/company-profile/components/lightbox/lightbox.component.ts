import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { MediaImage } from '../../../../core/models/profile.model';
import { getDriveLightboxUrl, getDriveFallbackThumbnailUrl } from '../../../../core/utils/drive-url';

@Component({
  selector: 'app-lightbox',
  standalone: true,
  templateUrl: './lightbox.component.html',
  styleUrls: ['./lightbox.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LightboxComponent implements OnInit, OnDestroy {
  readonly images = input.required<MediaImage[]>();
  readonly initialIndex = input<number>(0);
  readonly close = output<void>();

  private readonly closeButtonRef = viewChild<ElementRef<HTMLButtonElement>>('closeButton');
  private previousActiveElement: HTMLElement | null = null;
  private previousBodyOverflow = '';

  protected readonly currentIndex = signal(0);
  protected readonly fallbackAttempted = signal(false);

  private touchStartX = 0;

  ngOnInit(): void {
    this.currentIndex.set(this.initialIndex());

    // Save previous active element for focus restoration
    if (typeof document !== 'undefined') {
      this.previousActiveElement = document.activeElement as HTMLElement;
      this.previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }

    // Move focus inside dialog
    setTimeout(() => {
      this.closeButtonRef()?.nativeElement.focus();
    }, 50);
  }

  ngOnDestroy(): void {
    // Restore body scroll lock
    if (typeof document !== 'undefined') {
      document.body.style.overflow = this.previousBodyOverflow;
    }

    // Restore focus
    if (this.previousActiveElement && typeof this.previousActiveElement.focus === 'function') {
      this.previousActiveElement.focus();
    }
  }

  protected readonly currentImage = computed(() => {
    const list = this.images();
    const idx = this.currentIndex();
    if (idx >= 0 && idx < list.length) {
      return list[idx];
    }
    return list[0];
  });

  protected readonly currentImageUrl = computed(() => {
    const img = this.currentImage();
    if (!img) return '';
    if (this.fallbackAttempted()) {
      return getDriveFallbackThumbnailUrl(img.id, 1600);
    }
    return getDriveLightboxUrl(img.id);
  });

  protected readonly counterText = computed(() => {
    return `${this.currentIndex() + 1} / ${this.images().length}`;
  });

  onImageError(): void {
    if (!this.fallbackAttempted()) {
      this.fallbackAttempted.set(true);
    }
  }

  next(): void {
    const total = this.images().length;
    if (total === 0) return;
    this.fallbackAttempted.set(false);
    this.currentIndex.update((idx) => (idx + 1) % total);
  }

  prev(): void {
    const total = this.images().length;
    if (total === 0) return;
    this.fallbackAttempted.set(false);
    this.currentIndex.update((idx) => (idx - 1 + total) % total);
  }

  onClose(): void {
    this.close.emit();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.onClose();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.next();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.prev();
    }
  }

  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.touches[0].clientX;
  }

  onTouchEnd(event: TouchEvent): void {
    const touchEndX = event.changedTouches[0].clientX;
    const diff = this.touchStartX - touchEndX;

    if (Math.abs(diff) > 45) {
      if (diff > 0) {
        // Swiped left -> next
        this.next();
      } else {
        // Swiped right -> prev
        this.prev();
      }
    }
  }
}
