import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { CompanyVideosComponent } from './company-videos.component';
import { MediaVideo } from '../../../../core/models/profile.model';

@Component({
  standalone: true,
  imports: [CompanyVideosComponent],
  template: `
    <app-company-videos [videos]="videos()" />
  `,
})
class VideosTestHostComponent {
  videos = signal<MediaVideo[]>([
    { source: 'youtube', id: 'dQw4w9WgXcQ', name: 'Demo Video' },
  ]);
}

describe('CompanyVideosComponent', () => {
  let fixture: ComponentFixture<VideosTestHostComponent>;
  let host: VideosTestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VideosTestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VideosTestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render videos section when videos are present', () => {
    const section = fixture.nativeElement.querySelector('.videos-section');
    expect(section).toBeTruthy();
  });

  it('should hide videos section completely when videos array is empty', () => {
    host.videos.set([]);
    fixture.detectChanges();

    const section = fixture.nativeElement.querySelector('.videos-section');
    expect(section).toBeNull();
  });

  it('should render featured video and no additional videos container when only one video is present', () => {
    const featured = fixture.nativeElement.querySelector('.featured-video-wrapper');
    expect(featured).toBeTruthy();

    const additional = fixture.nativeElement.querySelector('.additional-videos-container');
    expect(additional).toBeNull();
  });

  it('should render additional videos in grid when more than one video is present', () => {
    host.videos.set([
      { source: 'youtube', id: 'video1', name: 'First' },
      { source: 'youtube', id: 'video2', name: 'Second' },
      { source: 'drive', id: '1ABC_xyz-12345', name: 'Third' },
    ]);
    fixture.detectChanges();

    const additional = fixture.nativeElement.querySelector('.additional-videos-container');
    expect(additional).toBeTruthy();

    const cards = fixture.nativeElement.querySelectorAll('.additional-videos-grid app-video-card');
    expect(cards.length).toBe(2);
  });
});
