export type LogoSource = 'drive' | 'url';

export interface DriveLogo {
  source: 'drive';
  id: string;
}

export interface UrlLogo {
  source: 'url';
  url: string;
}

export type LogoInfo = DriveLogo | UrlLogo | null;

export interface MediaImage {
  id: string;
  name: string;
}

export type VideoSource = 'drive' | 'youtube';

export interface MediaVideo {
  source: VideoSource;
  id: string;
  name: string;
}

export interface ProfileData {
  country: string;
  company: string;
  location: string;
  companyDetails: string;
  jobDetails: string;
  logo: LogoInfo;
  images: MediaImage[];
  videos: MediaVideo[];
  warnings?: string[];
}

export type ApiErrorCode = 'NOT_FOUND' | 'DUPLICATE' | 'BAD_REQUEST' | 'SERVER_ERROR';

export interface ApiError {
  code: ApiErrorCode;
  message: string;
}

export interface ApiSuccessResponse {
  ok: true;
  data: ProfileData;
}

export interface ApiErrorResponse {
  ok: false;
  error: ApiError;
}

export type ApiResponse = ApiSuccessResponse | ApiErrorResponse;

export type ProfileLoadStatus = 'loading' | 'loaded' | 'notFound' | 'duplicate' | 'error';

export interface ProfileState {
  status: ProfileLoadStatus;
  data: ProfileData | null;
  errorMessage: string | null;
  errorCode: ApiErrorCode | null;
}
