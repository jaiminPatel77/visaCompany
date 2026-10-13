import { slugify, isValidSlug } from './slugify';

describe('slugify utility', () => {
  it('should pass canonical test vectors', () => {
    expect(slugify('Tata Consultancy Services')).toBe('tata-consultancy-services');
    expect(slugify('  UK  ')).toBe('uk');
    expect(slugify('A&B   Co.')).toBe('a-b-co');
    expect(slugify('Café Münch')).toBe('cafe-munch');
    expect(slugify('!!!')).toBe('');
  });

  it('should handle Devanagari examples stably and non-empty', () => {
    const devanagari = 'टाटा मोटर्स';
    const slug1 = slugify(devanagari);
    const slug2 = slugify(devanagari);

    expect(slug1.length).toBeGreaterThan(0);
    expect(slug1).toBe(slug2);
    expect(slug1).not.toContain(' ');
  });

  it('should handle Gujarati examples stably and non-empty', () => {
    const gujarati = 'રિલાયન્સ ઇન્ડસ્ટ્રીઝ';
    const slug1 = slugify(gujarati);
    const slug2 = slugify(gujarati);

    expect(slug1.length).toBeGreaterThan(0);
    expect(slug1).toBe(slug2);
    expect(slug1).not.toContain(' ');
  });

  it('should handle null, undefined, empty inputs', () => {
    expect(slugify(null)).toBe('');
    expect(slugify(undefined)).toBe('');
    expect(slugify('')).toBe('');
    expect(slugify('   ')).toBe('');
  });

  it('should validate slugs with isValidSlug', () => {
    expect(isValidSlug('tata-consultancy-services')).toBeTrue();
    expect(isValidSlug('')).toBeFalse();
    expect(isValidSlug('invalid/path')).toBeFalse();
  });
});
