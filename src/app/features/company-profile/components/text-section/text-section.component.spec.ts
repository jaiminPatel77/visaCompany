import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { TextSectionComponent } from './text-section.component';

@Component({
  standalone: true,
  imports: [TextSectionComponent],
  template: `
    <app-text-section [title]="title()" [rawText]="text()" />
  `,
})
class TestHostComponent {
  title = signal('Test Section');
  text = signal<string | null | undefined>('Initial content');
}

describe('TextSectionComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render section when text is provided', () => {
    const card = fixture.nativeElement.querySelector('.profile-card');
    expect(card).toBeTruthy();
    expect(card.textContent).toContain('Initial content');
  });

  it('should completely hide section when text is null or empty', () => {
    host.text.set(null);
    fixture.detectChanges();

    const cardNull = fixture.nativeElement.querySelector('.profile-card');
    expect(cardNull).toBeNull();

    host.text.set('   \n\n   ');
    fixture.detectChanges();

    const cardWhitespace = fixture.nativeElement.querySelector('.profile-card');
    expect(cardWhitespace).toBeNull();
  });
});
