/**
 * Shared utility functions for consistent formatting across the application
 */

/**
 * Format a number as currency (USD)
 * @param amount - The amount to format
 * @param includeSign - Whether to include the $ sign (default: true)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, includeSign: boolean = true): string {
  const formatted = Math.abs(amount).toFixed(2);
  return includeSign ? `$${formatted}` : formatted;
}

/**
 * Format a number as currency with proper negative handling
 * @param amount - The amount to format
 * @returns Formatted currency string with proper negative sign placement
 */
export function formatCurrencyWithSign(amount: number): string {
  const absAmount = Math.abs(amount);
  const formatted = formatCurrency(absAmount);
  return amount < 0 ? `-${formatted}` : formatted;
}

/**
 * Format a date to YYYY-MM-DD format
 * @param date - Date object or string
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateToISO(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toISOString().split('T')[0];
}

/**
 * Format a date for display
 * @param date - Date object or string
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string, 
  options: Intl.DateTimeFormatOptions = { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  }
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', options);
}

/**
 * Format a date as relative time (e.g., "2 hours ago", "in 3 days")
 * @param date - Date object or string
 * @returns Relative time string
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInMs = dateObj.getTime() - now.getTime();
  const diffInSecs = Math.floor(diffInMs / 1000);
  const diffInMins = Math.floor(diffInSecs / 60);
  const diffInHours = Math.floor(diffInMins / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (Math.abs(diffInSecs) < 60) {
    return 'just now';
  } else if (Math.abs(diffInMins) < 60) {
    const mins = Math.abs(diffInMins);
    return diffInMins < 0 
      ? `${mins} minute${mins !== 1 ? 's' : ''} ago`
      : `in ${mins} minute${mins !== 1 ? 's' : ''}`;
  } else if (Math.abs(diffInHours) < 24) {
    const hours = Math.abs(diffInHours);
    return diffInHours < 0
      ? `${hours} hour${hours !== 1 ? 's' : ''} ago`
      : `in ${hours} hour${hours !== 1 ? 's' : ''}`;
  } else if (Math.abs(diffInDays) < 30) {
    const days = Math.abs(diffInDays);
    return diffInDays < 0
      ? `${days} day${days !== 1 ? 's' : ''} ago`
      : `in ${days} day${days !== 1 ? 's' : ''}`;
  } else {
    return formatDate(dateObj);
  }
}

/**
 * Get today's date in YYYY-MM-DD format
 * @returns Today's date string
 */
export function getTodayISO(): string {
  return formatDateToISO(new Date());
}

/**
 * Parse a currency string to a number
 * @param currencyString - String like "$123.45" or "123.45"
 * @returns Parsed number
 */
export function parseCurrency(currencyString: string): number {
  const cleaned = currencyString.replace(/[$,]/g, '').trim();
  return parseFloat(cleaned) || 0;
}

/**
 * Format a percentage
 * @param value - The value to format (0.5 = 50%)
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals: number = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}