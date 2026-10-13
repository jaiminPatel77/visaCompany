import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { LightboxComponent } from './lightbox.component';
import { MediaImage } from '../../../../core/models/profile.model';

@Component({
  standalone: true,
  imports: [LightboxComponent],
  template: `
    <app-lightbox
      [images]="images()"
      [initialIndex]="index()"
      (close)="onClose()"
    />
  `,
})
class LightboxHostComponent {
  images = signal<MediaImage[]>([
    { id: '1ABC_xyz-12345', name: 'photo-1.jpg' },
    { id: '1DEF_xyz-67890', name: 'photo-2.jpg' },
    { id: '1GHI_xyz-11223', name: 'photo-3.jpg' },
  ]);
  index = signal(0);
  closed = false;

  onClose(): void {
    this.closed = true;
  }
}

describe('LightboxComponent', () => {
  let fixture: ComponentFixture<LightboxHostComponent>;
  let host: LightboxHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LightboxHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LightboxHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render dialog with counter and close button', () => {
    const dialog = fixture.nativeElement.querySelector('.lightbox-backdrop');
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');

    const counter = fixture.nativeElement.querySelector('.counter');
    expect(counter?.textContent).toContain('1 / 3');
  });

  it('should navigate to next and previous images on button click and keyboard', () => {
    const nextBtn = fixture.nativeElement.querySelector('.next-btn');
    nextBtn.click();
    fixture.detectChanges();

    const counter = fixture.nativeElement.querySelector('.counter');
    expect(counter?.textContent).toContain('2 / 3');

    // Keyboard ArrowLeft
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    fixture.detectChanges();
    expect(counter?.textContent).toContain('1 / 3');
  });

  it('should emit close on Escape key or close button click', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(host.closed).toBeTrue();
  });
});
