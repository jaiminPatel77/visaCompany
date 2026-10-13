import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { CompanyService } from '../../core/services/company.service';
import { ProfileState } from '../../core/models/profile.model';
import { slugify } from '../../core/utils/slugify';
import { LoadingSkeletonComponent } from '../../shared/components/loading-skeleton/loading-skeleton.component';
import { NotFoundComponent } from '../../shared/components/not-found/not-found.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { CompanyHeaderComponent } from './components/company-header/company-header.component';
import { TextSectionComponent } from './components/text-section/text-section.component';
import { CompanyGalleryComponent } from './components/company-gallery/company-gallery.component';
import { CompanyVideosComponent } from './components/company-videos/company-videos.component';

const INITIAL_PROFILE_STATE: ProfileState = {
  status: 'loading',
  data: null,
  errorMessage: null,
  errorCode: null,
};

@Component({
  selector: 'app-company-profile-page',
  standalone: true,
  imports: [
    LoadingSkeletonComponent,
    NotFoundComponent,
    ErrorStateComponent,
    CompanyHeaderComponent,
    TextSectionComponent,
    CompanyGalleryComponent,
    CompanyVideosComponent,
  ],
  templateUrl: './company-profile.page.html',
  styleUrls: ['./company-profile.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanyProfilePage {
  private readonly companyService = inject(CompanyService);
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);

  // Bound from route parameters via withComponentInputBinding()
  readonly country = input<string>('');
  readonly company = input<string>('');

  protected readonly retryTrigger = signal(0);

  // Observable source for route / retry triggers
  private readonly params$ = toObservable(
    computed(() => ({
      country: this.country(),
      company: this.company(),
      retry: this.retryTrigger(),
    }))
  );

  protected readonly state = toSignal(
    this.params$.pipe(
      switchMap(({ country, company }) => {
        let countrySlug = '';
        let companySlug = '';

        try {
          countrySlug = slugify(decodeURIComponent(country || ''));
          companySlug = slugify(decodeURIComponent(company || ''));
        } catch {
          countrySlug = slugify(country || '');
          companySlug = slugify(company || '');
        }

        if (!countrySlug || !companySlug) {
          return of<ProfileState>({
            status: 'notFound',
            data: null,
            errorMessage: 'Company Not Found',
            errorCode: 'NOT_FOUND',
          });
        }

        return this.companyService.getProfile(countrySlug, companySlug);
      })
    ),
    {
      initialValue: INITIAL_PROFILE_STATE,
    }
  );

  constructor() {
    // Effect to update Document Title and Meta Description reactively
    effect(() => {
      const currentState = this.state();

      if (currentState.status === 'loaded' && currentState.data) {
        const data = currentState.data;
        this.titleService.setTitle(`${data.company} | Business Profile`);

        if (data.companyDetails) {
          const cleanSnippet = data.companyDetails
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 150);
          this.metaService.updateTag({
            name: 'description',
            content: cleanSnippet,
          });
        } else {
          this.metaService.updateTag({
            name: 'description',
            content: `Official business profile for ${data.company} in ${data.country}.`,
          });
        }
      } else if (currentState.status === 'notFound') {
        this.titleService.setTitle('Company Not Found | Business Profile');
        this.metaService.updateTag({
          name: 'description',
          content: 'Company profile not found.',
        });
      } else if (currentState.status === 'duplicate') {
        this.titleService.setTitle('Profile Unavailable | Business Profile');
        this.metaService.updateTag({
          name: 'description',
          content: 'This company profile is temporarily unavailable.',
        });
      } else if (currentState.status === 'error') {
        this.titleService.setTitle('Error | Business Profile');
      } else {
        this.titleService.setTitle('Business Profile');
      }
    });
  }

  onRetry(): void {
    this.retryTrigger.update((n) => n + 1);
  }
}
export default CompanyProfilePage;
