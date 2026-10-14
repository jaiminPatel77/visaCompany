import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { CompanyGalleryComponent } from './company-gallery.component';
import { MediaImage } from '../../../../core/models/profile.model';

@Component({
  standalone: true,
  imports: [CompanyGalleryComponent],
  template: `
    <app-company-gallery [images]="images()" />
  `,
})
class GalleryTestHostComponent {
  images = signal<MediaImage[]>([
    { id: '1ABC_xyz-12345', name: 'office.jpg' },
    { id: '1DEF_xyz-67890', name: 'team.jpg' },
  ]);
}

describe('CompanyGalleryComponent', () => {
  let fixture: ComponentFixture<GalleryTestHostComponent>;
  let host: GalleryTestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GalleryTestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GalleryTestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render gallery tiles when images are provided', () => {
    const section = fixture.nativeElement.querySelector('.gallery-section');
    expect(section).toBeTruthy();

    const tiles = fixture.nativeElement.querySelectorAll('.gallery-tile');
    expect(tiles.length).toBe(2);
  });

  it('should completely hide section when images array is empty', () => {
    host.images.set([]);
    fixture.detectChanges();

    const section = fixture.nativeElement.querySelector('.gallery-section');
    expect(section).toBeNull();
  });

  it('should add few-images class when images count is 1 or 2', () => {
    const grid = fixture.nativeElement.querySelector('.gallery-grid');
    expect(grid.classList.contains('few-images')).toBeTrue();
  });

  it('should not add few-images class when images count is 3 or more', () => {
    host.images.set([
      { id: '1', name: 'a.jpg' },
      { id: '2', name: 'b.jpg' },
      { id: '3', name: 'c.jpg' },
    ]);
    fixture.detectChanges();

    const grid = fixture.nativeElement.querySelector('.gallery-grid');
    expect(grid.classList.contains('few-images')).toBeFalse();
  });
});
