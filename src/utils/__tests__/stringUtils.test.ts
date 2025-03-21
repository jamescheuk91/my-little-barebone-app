import { trimQuotes } from '../stringUtils';

describe('stringUtils', () => {
  describe('trimQuotes', () => {
    it('should remove double quotes from start and end', () => {
      expect(trimQuotes('"Hello"')).toBe('Hello');
    });
    
    it('should remove single quotes from start and end', () => {
      expect(trimQuotes('\'Hello\'')).toBe('Hello');
    });
    
    it('should not remove mixed quotes', () => {
      expect(trimQuotes('\'Hello"')).toBe('\'Hello"');
      expect(trimQuotes('"Hello\'')).toBe('"Hello\'');
    });
    
    it('should handle spaces inside quotes', () => {
      expect(trimQuotes('" Hello "')).toBe('Hello');
      expect(trimQuotes('\' Hello \'')).toBe('Hello');
    });
    
    it('should preserve quotes in middle of string', () => {
      expect(trimQuotes('Hello "World"')).toBe('Hello "World"');
    });
    
    it('should handle empty string', () => {
      expect(trimQuotes('')).toBe('');
    });
    
    it('should handle null input', () => {
      expect(trimQuotes(null as unknown as string)).toBe('');
    });
    
    it('should handle undefined input', () => {
      expect(trimQuotes(undefined as unknown as string)).toBe('');
    });
    
    it('should only remove quotes at start and end when they match', () => {
      expect(trimQuotes('"Hong Alibaba Upward Trend"')).toBe('Hong Alibaba Upward Trend');
    });
    
    it('should trim whitespace before handling quotes', () => {
      expect(trimQuotes('  "Hello"  ')).toBe('Hello');
    });
    
    it('should not remove unpaired quotes', () => {
      expect(trimQuotes('"Hello')).toBe('"Hello');
      expect(trimQuotes('Hello"')).toBe('Hello"');
    });
  });
});