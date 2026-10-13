import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-not-found',
  standalone: true,
  templateUrl: './not-found.component.html',
  styleUrls: ['./not-found.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundComponent {
  readonly title = input<string>('Company Not Found');
  readonly message = input<string>(
    'The requested company profile could not be found. Please check the URL or verify the profile information.'
  );
}
