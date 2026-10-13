import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { LogoInfo } from '../../../../core/models/profile.model';
import { getDriveThumbnailUrl, getDriveFallbackThumbnailUrl, isValidHttpsUrl } from '../../../../core/utils/drive-url';
import { getCompanyInitials } from '../../../../core/utils/initials';

@Component({
  selector: 'app-company-header',
  standalone: true,
  templateUrl: './company-header.component.html',
  styleUrls: ['./company-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanyHeaderComponent {
  readonly company = input.required<string>();
  readonly country = input.required<string>();
  readonly location = input<string | null | undefined>('');
  readonly logo = input<LogoInfo>(null);

  protected readonly logoFailed = signal(false);
  protected readonly retryAttempted = signal(false);

  protected readonly initials = computed(() => getCompanyInitials(this.company()));

  protected readonly hasValidLocation = computed(() => {
    const loc = this.location();
    return Boolean(loc && loc.trim().length > 0);
  });

  protected readonly logoUrl = computed(() => {
    if (this.logoFailed()) return '';
    const l = this.logo();
    if (!l) return '';

    if (l.source === 'url') {
      return isValidHttpsUrl(l.url) ? l.url : '';
    }

    if (l.source === 'drive') {
      if (this.retryAttempted()) {
        return getDriveFallbackThumbnailUrl(l.id, 400);
      }
      return getDriveThumbnailUrl(l.id, 400);
    }

    return '';
  });

  onLogoError(): void {
    const l = this.logo();
    if (l && l.source === 'drive' && !this.retryAttempted()) {
      this.retryAttempted.set(true);
    } else {
      this.logoFailed.set(true);
    }
  }
}
