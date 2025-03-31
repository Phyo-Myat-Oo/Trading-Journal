import { splitDisplayName } from '../nameUtils';

describe('nameUtils', () => {
  describe('splitDisplayName', () => {
    it('should correctly split a name with first and last parts', () => {
      const result = splitDisplayName('John Doe');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
    });

    it('should handle multi-word last names', () => {
      const result = splitDisplayName('John van der Doe');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('van der Doe');
    });

    it('should handle multi-word names like Asian or full names', () => {
      const result = splitDisplayName('Su Khin Lin Khine');
      expect(result.firstName).toBe('Su');
      expect(result.lastName).toBe('Khin Lin Khine');
    });

    it('should handle single-word names', () => {
      const result = splitDisplayName('Madonna');
      expect(result.firstName).toBe('Madonna');
      expect(result.lastName).toBe('FromGoogle');
    });

    it('should handle undefined input', () => {
      const result = splitDisplayName(undefined);
      expect(result.firstName).toBe('User');
      expect(result.lastName).toBe('Unknown');
    });

    it('should handle empty string input', () => {
      const result = splitDisplayName('');
      expect(result.firstName).toBe('User');
      expect(result.lastName).toBe('Unknown');
    });

    it('should trim excess whitespace', () => {
      const result = splitDisplayName('  John   Doe  ');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
    });
  });
}); 