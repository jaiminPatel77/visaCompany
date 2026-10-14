import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { VideoCardComponent } from './video-card.component';
import { MediaVideo } from '../../../../core/models/profile.model';

@Component({
  standalone: true,
  imports: [VideoCardComponent],
  template: `
    <app-video-card [video]="video()" [index]="0" />
  `,
})
class VideoCardTestHostComponent {
  video = signal<MediaVideo>({
    source: 'youtube',
    id: 'dQw4w9WgXcQ',
    name: 'Introduction.mp4',
  });
}

describe('VideoCardComponent', () => {
  let fixture: ComponentFixture<VideoCardTestHostComponent>;
  let host: VideoCardTestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VideoCardTestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VideoCardTestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    // Ensure body overflow is restored
    document.body.style.overflow = '';
  });

  it('should render poster and clean title without extension', () => {
    const title = fixture.nativeElement.querySelector('.video-title');
    expect(title?.textContent?.trim()).toBe('Introduction');

    const poster = fixture.nativeElement.querySelector('.poster-card');
    expect(poster).toBeTruthy();
    expect(poster.getAttribute('aria-label')).toBe('Play video: Introduction');
  });

  it('should fall back to Company Video 1 if name is missing', () => {
    host.video.set({ source: 'youtube', id: 'dQw4w9WgXcQ', name: '' });
    fixture.detectChanges();

    const title = fixture.nativeElement.querySelector('.video-title');
    expect(title?.textContent?.trim()).toBe('Company Video 1');
  });

  it('should not display iframe before clicking play', () => {
    const iframe = fixture.nativeElement.querySelector('.modal-video-iframe');
    expect(iframe).toBeNull();
  });

  it('should open modal with 16:9 iframe, strict-origin-when-cross-origin, and lock body scroll on click', () => {
    const poster = fixture.nativeElement.querySelector('.poster-card');
    poster.click();
    fixture.detectChanges();

    const modal = fixture.nativeElement.querySelector('.video-modal-backdrop');
    expect(modal).toBeTruthy();
    expect(modal.getAttribute('role')).toBe('dialog');
    expect(modal.getAttribute('aria-modal')).toBe('true');
    expect(document.body.style.overflow).toBe('hidden');

    const iframe = fixture.nativeElement.querySelector('.modal-video-iframe');
    expect(iframe).toBeTruthy();
    expect(iframe.getAttribute('referrerpolicy')).toBe('strict-origin-when-cross-origin');
    expect(iframe.getAttribute('src')).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });

  it('should close modal, destroy iframe, and unlock scroll on close button click', () => {
    const poster = fixture.nativeElement.querySelector('.poster-card');
    poster.click();
    fixture.detectChanges();

    const closeBtn = fixture.nativeElement.querySelector('.modal-close-btn');
    expect(closeBtn).toBeTruthy();
    closeBtn.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.video-modal-backdrop')).toBeNull();
    expect(fixture.nativeElement.querySelector('.modal-video-iframe')).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });

  it('should close modal on Escape key press', () => {
    const poster = fixture.nativeElement.querySelector('.poster-card');
    poster.click();
    fixture.detectChanges();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.video-modal-backdrop')).toBeNull();
    expect(fixture.nativeElement.querySelector('.modal-video-iframe')).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });
});
