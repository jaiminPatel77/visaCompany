import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { parseTextBlocks, TextBlock } from '../../../../core/utils/text-blocks';

@Component({
  selector: 'app-text-section',
  standalone: true,
  templateUrl: './text-section.component.html',
  styleUrls: ['./text-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextSectionComponent {
  readonly title = input.required<string>();
  readonly rawText = input<string | null | undefined>('');

  protected readonly blocks = computed<TextBlock[]>(() => {
    return parseTextBlocks(this.rawText());
  });

  protected readonly hasContent = computed<boolean>(() => {
    return this.blocks().length > 0;
  });
}
