import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { MediaImage } from '../../../../core/models/profile.model';
import { getDriveThumbnailUrl, getDriveFallbackThumbnailUrl } from '../../../../core/utils/drive-url';
import { LightboxComponent } from '../lightbox/lightbox.component';

@Component({
  selector: 'app-company-gallery',
  standalone: true,
  imports: [LightboxComponent],
  templateUrl: './company-gallery.component.html',
  styleUrls: ['./company-gallery.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanyGalleryComponent {
  readonly images = input<MediaImage[]>([]);

  protected readonly failedIds = signal<Set<string>>(new Set());
  protected readonly retriedIds = signal<Set<string>>(new Set());

  protected readonly lightboxOpen = signal(false);
  protected readonly selectedIndex = signal(0);

  /**
   * Visible images filtering out completely failed tiles.
   */
  protected readonly visibleImages = computed<MediaImage[]>(() => {
    const list = this.images() || [];
    const failed = this.failedIds();
    return list.filter((img) => !failed.has(img.id));
  });

  /**
   * Hide the whole section if there are no valid visible images.
   */
  protected readonly hasVisibleImages = computed<boolean>(() => {
    return this.visibleImages().length > 0;
  });

  getImageUrl(id: string): string {
    if (this.retriedIds().has(id)) {
      return getDriveFallbackThumbnailUrl(id, 800);
    }
    return getDriveThumbnailUrl(id, 800);
  }

  onImageError(id: string): void {
    if (!this.retriedIds().has(id)) {
      // First error -> retry once with lh3 url
      this.retriedIds.update((set) => new Set(set).add(id));
    } else {
      // Second error -> fail permanently, hide tile
      this.failedIds.update((set) => new Set(set).add(id));
    }
  }

  openLightbox(index: number): void {
    this.selectedIndex.set(index);
    this.lightboxOpen.set(true);
  }

  closeLightbox(): void {
    this.lightboxOpen.set(false);
  }
}
