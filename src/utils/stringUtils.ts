/**
 * Trims quotes from the beginning and end of a string if they form a matching pair
 * @param text - The input string to process
 * @returns The processed string with quotes removed from beginning and end
 */
export function trimQuotes(text: string): string {
  if (!text) return '';
  
  // First trim whitespace
  const trimmed = text.trim();
  
  // Only remove quotes from beginning and end when they form a matching pair
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.substring(1, trimmed.length - 1).trim();
  }
  
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.substring(1, trimmed.length - 1).trim();
  }
  
  // For strings with quotes in the middle or unmatched quotes, return as is
  return trimmed;
}