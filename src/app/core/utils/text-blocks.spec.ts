import { parseTextBlocks } from './text-blocks';

describe('text-blocks parser', () => {
  it('should parse paragraphs and preserve internal line breaks', () => {
    const input = 'First line\nSecond line\n\nAnother paragraph';
    const blocks = parseTextBlocks(input);

    expect(blocks.length).toBe(2);
    expect(blocks[0].type).toBe('paragraph');
    if (blocks[0].type === 'paragraph') {
      expect(blocks[0].lines).toEqual(['First line', 'Second line']);
    }
    expect(blocks[1].type).toBe('paragraph');
    if (blocks[1].type === 'paragraph') {
      expect(blocks[1].lines).toEqual(['Another paragraph']);
    }
  });

  it('should parse bullet lists with different bullet symbols', () => {
    const input = '- First bullet\n• Second bullet\n* Third bullet';
    const blocks = parseTextBlocks(input);

    expect(blocks.length).toBe(1);
    expect(blocks[0].type).toBe('bullet-list');
    if (blocks[0].type === 'bullet-list') {
      expect(blocks[0].items).toEqual(['First bullet', 'Second bullet', 'Third bullet']);
    }
  });

  it('should parse numbered lists', () => {
    const input = '1. First item\n2. Second item\n3. Third item';
    const blocks = parseTextBlocks(input);

    expect(blocks.length).toBe(1);
    expect(blocks[0].type).toBe('numbered-list');
    if (blocks[0].type === 'numbered-list') {
      expect(blocks[0].items).toEqual(['First item', 'Second item', 'Third item']);
    }
  });

  it('should parse sub-headings ending with colon or wrapped in double asterisks', () => {
    const input = 'Key Strengths:\nWe deliver results.\n\n**About Leadership**\nDecades of experience.';
    const blocks = parseTextBlocks(input);

    expect(blocks.length).toBe(4);
    expect(blocks[0].type).toBe('subheading');
    if (blocks[0].type === 'subheading') {
      expect(blocks[0].text).toBe('Key Strengths:');
    }
    expect(blocks[1].type).toBe('paragraph');
    expect(blocks[2].type).toBe('subheading');
    if (blocks[2].type === 'subheading') {
      expect(blocks[2].text).toBe('About Leadership');
    }
    expect(blocks[3].type).toBe('paragraph');
  });

  it('should treat HTML tags as plain literal strings without interpreting them', () => {
    const malicious = '<script>alert("xss")</script>\n<img src=x onerror=alert(1)>\n<b>Bold HTML</b>';
    const blocks = parseTextBlocks(malicious);

    expect(blocks.length).toBe(1);
    expect(blocks[0].type).toBe('paragraph');
    if (blocks[0].type === 'paragraph') {
      expect(blocks[0].lines[0]).toBe('<script>alert("xss")</script>');
      expect(blocks[0].lines[1]).toBe('<img src=x onerror=alert(1)>');
      expect(blocks[0].lines[2]).toBe('<b>Bold HTML</b>');
    }
  });

  it('should return empty array for empty, whitespace or null inputs', () => {
    expect(parseTextBlocks(null)).toEqual([]);
    expect(parseTextBlocks(undefined)).toEqual([]);
    expect(parseTextBlocks('')).toEqual([]);
    expect(parseTextBlocks('   \n\n   ')).toEqual([]);
  });
});
