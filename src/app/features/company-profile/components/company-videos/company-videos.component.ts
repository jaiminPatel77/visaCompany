import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MediaVideo } from '../../../../core/models/profile.model';
import { VideoCardComponent } from '../video-card/video-card.component';

@Component({
  selector: 'app-company-videos',
  standalone: true,
  imports: [VideoCardComponent],
  templateUrl: './company-videos.component.html',
  styleUrls: ['./company-videos.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanyVideosComponent {
  readonly videos = input<MediaVideo[]>([]);

  protected readonly hasVideos = computed<boolean>(() => {
    const list = this.videos();
    return Boolean(list && list.length > 0);
  });
}
