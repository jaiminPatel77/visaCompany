import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, retry, timeout } from 'rxjs/operators';
import { ApiResponse, ProfileData, ProfileState } from '../models/profile.model';

@Injectable({
  providedIn: 'root',
})
export class CompanyService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/profile';

  /**
   * Fetches company profile by slugified country and company names.
   * - plain GET to /api/profile with NO custom headers
   * - 15 second timeout
   * - 1 retry on network failure
   * - maps to loaded | notFound | duplicate | error
   * - outages or timeouts NEVER map to notFound
   */
  getProfile(country: string, company: string): Observable<ProfileState> {
    const params = new HttpParams()
      .set('country', country.trim())
      .set('company', company.trim());

    return this.http.get<ApiResponse>(this.apiUrl, { params }).pipe(
      timeout(15000),
      retry({ count: 1, delay: 500 }),
      map((res): ProfileState => {
        if (res.ok) {
          return {
            status: 'loaded',
            data: res.data,
            errorMessage: null,
            errorCode: null,
          };
        }

        const code = res.error?.code;
        const msg = res.error?.message || 'An error occurred';

        if (code === 'NOT_FOUND') {
          return {
            status: 'notFound',
            data: null,
            errorMessage: msg,
            errorCode: 'NOT_FOUND',
          };
        }

        if (code === 'DUPLICATE') {
          return {
            status: 'duplicate',
            data: null,
            errorMessage: msg,
            errorCode: 'DUPLICATE',
          };
        }

        return {
          status: 'error',
          data: null,
          errorMessage: msg,
          errorCode: code || 'SERVER_ERROR',
        };
      }),
      catchError((err: unknown): Observable<ProfileState> => {
        // Inspect if upstream proxy or server returned structured JSON error envelope
        if (err instanceof HttpErrorResponse && err.error && typeof err.error === 'object') {
          const apiError = err.error as ApiResponse;
          if (apiError.ok === false && apiError.error) {
            const code = apiError.error.code;
            const message = apiError.error.message || 'An error occurred';
            if (code === 'NOT_FOUND') {
              return of({
                status: 'notFound',
                data: null,
                errorMessage: message,
                errorCode: 'NOT_FOUND',
              });
            }
            if (code === 'DUPLICATE') {
              return of({
                status: 'duplicate',
                data: null,
                errorMessage: message,
                errorCode: 'DUPLICATE',
              });
            }
            return of({
              status: 'error',
              data: null,
              errorMessage: message,
              errorCode: code,
            });
          }
        }

        // Outages, network drops, timeouts or unparsable errors must NEVER show notFound
        return of({
          status: 'error',
          data: null,
          errorMessage: 'Unable to connect to service. Please check your connection and try again.',
          errorCode: 'SERVER_ERROR',
        });
      })
    );
  }
}
