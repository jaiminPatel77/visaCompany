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
    return (this.videos()?.length ?? 0) > 0;
  });

  protected readonly featuredVideo = computed<MediaVideo | null>(() => {
    const list = this.videos();
    return list && list.length > 0 ? list[0] : null;
  });

  protected readonly additionalVideos = computed<MediaVideo[]>(() => {
    const list = this.videos();
    return list && list.length > 1 ? list.slice(1) : [];
  });

  protected readonly sectionTitle = computed<string>(() => {
    return (this.videos()?.length ?? 0) > 1 ? 'Company Videos' : 'Company Video';
  });
}
