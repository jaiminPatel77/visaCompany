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
});
