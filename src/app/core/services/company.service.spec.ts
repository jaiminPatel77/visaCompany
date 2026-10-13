import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { CompanyService } from './company.service';
import { ProfileData, ApiResponse } from '../models/profile.model';

describe('CompanyService', () => {
  let service: CompanyService;
  let httpTesting: HttpTestingController;

  const mockProfile: ProfileData = {
    country: 'India',
    company: 'Demo Technologies',
    location: 'Mumbai',
    companyDetails: 'Details text',
    jobDetails: 'Jobs text',
    logo: { source: 'url', url: 'https://example.com/logo.png' },
    images: [{ id: '1ABC_xyz-12345', name: 'office.jpg' }],
    videos: [{ source: 'youtube', id: 'dQw4w9WgXcQ', name: 'Demo' }],
    warnings: [],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CompanyService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(CompanyService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should map successful response to loaded state', () => {
    const successResponse: ApiResponse = {
      ok: true,
      data: mockProfile,
    };

    service.getProfile('india', 'demo-technologies').subscribe((state) => {
      expect(state.status).toBe('loaded');
      expect(state.data).toEqual(mockProfile);
      expect(state.errorMessage).toBeNull();
    });

    const req = httpTesting.expectOne((r) =>
      r.url === '/api/profile' &&
      r.params.get('country') === 'india' &&
      r.params.get('company') === 'demo-technologies'
    );
    expect(req.request.method).toBe('GET');
    req.flush(successResponse);
  });

  it('should map NOT_FOUND error response to notFound state', () => {
    const notFoundResponse: ApiResponse = {
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Company not found.' },
    };

    service.getProfile('india', 'unknown-co').subscribe((state) => {
      expect(state.status).toBe('notFound');
      expect(state.data).toBeNull();
      expect(state.errorCode).toBe('NOT_FOUND');
    });

    const req = httpTesting.expectOne((r) => r.url === '/api/profile');
    req.flush(notFoundResponse);
  });

  it('should map DUPLICATE error response to duplicate state', () => {
    const duplicateResponse: ApiResponse = {
      ok: false,
      error: {
        code: 'DUPLICATE',
        message: 'This profile is temporarily unavailable.',
      },
    };

    service.getProfile('india', 'duplicate-co').subscribe((state) => {
      expect(state.status).toBe('duplicate');
      expect(state.data).toBeNull();
      expect(state.errorCode).toBe('DUPLICATE');
    });

    const req = httpTesting.expectOne((r) => r.url === '/api/profile');
    req.flush(duplicateResponse);
  });

  it('should map SERVER_ERROR to error state and NEVER to notFound', () => {
    const serverErrorResponse: ApiResponse = {
      ok: false,
      error: { code: 'SERVER_ERROR', message: 'Internal server error.' },
    };

    service.getProfile('india', 'error-co').subscribe((state) => {
      expect(state.status).toBe('error');
      expect(state.data).toBeNull();
      expect(state.errorCode).toBe('SERVER_ERROR');
      expect(state.status).not.toBe('notFound');
    });

    const req = httpTesting.expectOne((r) => r.url === '/api/profile');
    req.flush(serverErrorResponse);
  });

  it('should map network outage / HTTP 500 error to error state and NEVER to notFound', fakeAsync(() => {
    let resultState: any = null;
    service.getProfile('india', 'demo').subscribe((state) => {
      resultState = state;
    });

    const req1 = httpTesting.expectOne((r) => r.url === '/api/profile');
    // First attempt fails
    req1.error(new ProgressEvent('error'));

    // Advance time for retry delay
    tick(600);

    // Retry attempt
    const req2 = httpTesting.expectOne((r) => r.url === '/api/profile');
    req2.error(new ProgressEvent('error'));

    expect(resultState).toBeTruthy();
    expect(resultState.status).toBe('error');
    expect(resultState.status).not.toBe('notFound');
    expect(resultState.errorMessage).toContain('Unable to connect to service');
  }));
});
