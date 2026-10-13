import { getCompanyInitials } from './initials';

describe('initials utility', () => {
  it('should generate initials from multi-word company names', () => {
    expect(getCompanyInitials('Tata Consultancy Services')).toBe('TC');
    expect(getCompanyInitials('Demo Technologies')).toBe('DT');
    expect(getCompanyInitials('A&B Co.')).toBe('AB');
  });

  it('should generate initials from single word names', () => {
    expect(getCompanyInitials('Wipro')).toBe('WI');
    expect(getCompanyInitials('Infosys')).toBe('IN');
    expect(getCompanyInitials('X')).toBe('X');
  });

  it('should handle edge cases, empty and null values', () => {
    expect(getCompanyInitials(null)).toBe('');
    expect(getCompanyInitials(undefined)).toBe('');
    expect(getCompanyInitials('')).toBe('');
    expect(getCompanyInitials('   ')).toBe('');
  });
});
