export type TextBlock =
  | { type: 'subheading'; text: string }
  | { type: 'bullet-list'; items: string[] }
  | { type: 'numbered-list'; items: string[] }
  | { type: 'paragraph'; lines: string[] };

/**
 * Parses multi-line corporate text into safe, structured text blocks.
 * NEVER produces or evaluates HTML. All output is plain text for template interpolation.
 *
 * Rules:
 * - Blank line = new paragraph; single line breaks preserved inside a paragraph.
 * - Lines starting with '- ', '• ' or '* ' = bullet list.
 * - Lines starting with '1. ' (or '\d+. ') = numbered list.
 * - A short line (<= 60 chars) ending with ':', or wrapped in '**...**' = bold sub-heading.
 */
export function parseTextBlocks(text: string | null | undefined): TextBlock[] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  // Split raw text into lines
  const rawLines = text.split(/\r?\n/);
  const blocks: TextBlock[] = [];

  let currentParagraphLines: string[] = [];
  let currentBulletItems: string[] = [];
  let currentNumberedItems: string[] = [];

  const flushParagraph = () => {
    if (currentParagraphLines.length > 0) {
      blocks.push({
        type: 'paragraph',
        lines: [...currentParagraphLines],
      });
      currentParagraphLines = [];
    }
  };

  const flushBulletList = () => {
    if (currentBulletItems.length > 0) {
      blocks.push({
        type: 'bullet-list',
        items: [...currentBulletItems],
      });
      currentBulletItems = [];
    }
  };

  const flushNumberedList = () => {
    if (currentNumberedItems.length > 0) {
      blocks.push({
        type: 'numbered-list',
        items: [...currentNumberedItems],
      });
      currentNumberedItems = [];
    }
  };

  const flushAll = () => {
    flushParagraph();
    flushBulletList();
    flushNumberedList();
  };

  const isSubheading = (line: string): { isMatch: boolean; text: string } => {
    const t = line.trim();
    if (!t || t.length > 60) {
      return { isMatch: false, text: '' };
    }

    if (t.startsWith('**') && t.endsWith('**') && t.length >= 4) {
      const stripped = t.slice(2, -2).trim();
      return { isMatch: stripped.length > 0, text: stripped };
    }

    if (t.endsWith(':')) {
      return { isMatch: true, text: t };
    }

    return { isMatch: false, text: '' };
  };

  const isBulletLine = (line: string): boolean => {
    return /^[-•*]\s+/.test(line.trim());
  };

  const isNumberedLine = (line: string): boolean => {
    return /^\d+\.\s+/.test(line.trim());
  };

  for (const rawLine of rawLines) {
    const trimmedLine = rawLine.trim();

    // Blank line -> flush and separate blocks
    if (!trimmedLine) {
      flushAll();
      continue;
    }

    // Check for bullet list item
    if (isBulletLine(trimmedLine)) {
      flushParagraph();
      flushNumberedList();
      const content = trimmedLine.replace(/^[-•*]\s+/, '').trim();
      currentBulletItems.push(content);
      continue;
    }

    // Check for numbered list item
    if (isNumberedLine(trimmedLine)) {
      flushParagraph();
      flushBulletList();
      const content = trimmedLine.replace(/^\d+\.\s+/, '').trim();
      currentNumberedItems.push(content);
      continue;
    }

    // Check for sub-heading
    const subCheck = isSubheading(trimmedLine);
    if (subCheck.isMatch) {
      flushAll();
      blocks.push({
        type: 'subheading',
        text: subCheck.text,
      });
      continue;
    }

    // Otherwise, normal paragraph line
    flushBulletList();
    flushNumberedList();
    currentParagraphLines.push(trimmedLine);
  }

  flushAll();
  return blocks;
}
