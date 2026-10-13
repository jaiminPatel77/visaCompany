import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { CompanyProfilePage } from './company-profile.page';
import { CompanyService } from '../../core/services/company.service';
import { ProfileState } from '../../core/models/profile.model';

describe('CompanyProfilePage', () => {
  let fixture: ComponentFixture<CompanyProfilePage>;
  let component: CompanyProfilePage;
  let companyServiceSpy: jasmine.SpyObj<CompanyService>;

  const mockLoadedState: ProfileState = {
    status: 'loaded',
    data: {
      country: 'India',
      company: 'Demo Technologies',
      location: 'Mumbai',
      companyDetails: 'A high quality tech firm.\n\nKey Strengths:\n- Cloud Services',
      jobDetails: 'We are hiring.',
      logo: { source: 'url', url: 'https://example.com/logo.png' },
      images: [{ id: '1ABC_xyz-12345', name: 'img.jpg' }],
      videos: [{ source: 'youtube', id: 'dQw4w9WgXcQ', name: 'Demo' }],
      warnings: [],
    },
    errorMessage: null,
    errorCode: null,
  };

  beforeEach(async () => {
    companyServiceSpy = jasmine.createSpyObj('CompanyService', ['getProfile']);

    await TestBed.configureTestingModule({
      imports: [CompanyProfilePage],
      providers: [
        { provide: CompanyService, useValue: companyServiceSpy },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
  });

  it('should render loaded state with header and sections', async () => {
    companyServiceSpy.getProfile.and.returnValue(of(mockLoadedState));

    fixture = TestBed.createComponent(CompanyProfilePage);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('country', 'india');
    fixture.componentRef.setInput('company', 'demo-technologies');

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const titleEl = fixture.nativeElement.querySelector('.company-name');
    expect(titleEl?.textContent).toContain('Demo Technologies');

    const sections = fixture.nativeElement.querySelectorAll('app-text-section');
    expect(sections.length).toBe(2);
  });

  it('should render not-found state when company is not found', async () => {
    companyServiceSpy.getProfile.and.returnValue(
      of({
        status: 'notFound',
        data: null,
        errorMessage: 'Company Not Found',
        errorCode: 'NOT_FOUND',
      })
    );

    fixture = TestBed.createComponent(CompanyProfilePage);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('country', 'india');
    fixture.componentRef.setInput('company', 'non-existent');

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const notFoundEl = fixture.nativeElement.querySelector('app-not-found');
    expect(notFoundEl).toBeTruthy();
  });

  it('should render duplicate notice when state is duplicate', async () => {
    companyServiceSpy.getProfile.and.returnValue(
      of({
        status: 'duplicate',
        data: null,
        errorMessage: 'This profile is temporarily unavailable.',
        errorCode: 'DUPLICATE',
      })
    );

    fixture = TestBed.createComponent(CompanyProfilePage);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('country', 'india');
    fixture.componentRef.setInput('company', 'dup-co');

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const stateEl = fixture.nativeElement.querySelector('app-not-found');
    expect(stateEl).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('temporarily unavailable');
  });

  it('should render error state with retry button on outage', async () => {
    companyServiceSpy.getProfile.and.returnValue(
      of({
        status: 'error',
        data: null,
        errorMessage: 'Service connection failed',
        errorCode: 'SERVER_ERROR',
      })
    );

    fixture = TestBed.createComponent(CompanyProfilePage);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('country', 'india');
    fixture.componentRef.setInput('company', 'error-co');

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector('app-error-state');
    expect(errorEl).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.retry-btn')).toBeTruthy();

    // Trigger retry
    companyServiceSpy.getProfile.and.returnValue(of(mockLoadedState));
    component.onRetry();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(companyServiceSpy.getProfile).toHaveBeenCalledTimes(2);
  });
});
