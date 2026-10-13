import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-error-state',
  standalone: true,
  templateUrl: './error-state.component.html',
  styleUrls: ['./error-state.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorStateComponent {
  readonly title = input<string>('Unable to Load Profile');
  readonly message = input<string>(
    'A temporary connection issue occurred while fetching this profile. Please try again.'
  );
  readonly retry = output<void>();

  onRetry(): void {
    this.retry.emit();
  }
}
