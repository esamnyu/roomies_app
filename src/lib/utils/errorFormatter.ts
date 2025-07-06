import { z } from 'zod';

// Map of technical error messages to user-friendly messages
const errorMessageMap: Record<string, string> = {
  // Amount-related errors
  'Number must be less than or equal to 999999.99': 'Please enter an amount less than $1,000,000',
  'Amount too large': 'Please enter an amount less than $1,000,000',
  'Amount must be positive': 'Please enter a valid amount',
  'Number must be greater than 0': 'Please enter an amount greater than $0',
  
  // Required field errors
  'Required': 'This field is required',
  'Description required': 'Please enter a description',
  'At least one split required': 'Please add at least one person to split with',
  
  // Format errors
  'Invalid date format': 'Please select a valid date',
  'Invalid user ID': 'Please select a valid user',
  'Invalid household ID': 'Invalid household selected',
  'Invalid payer ID': 'Please select who paid for this expense',
  
  // Length errors
  'Description too long': 'Description must be less than 200 characters',
  'Too many splits': 'You can only split between up to 50 people',
};

// Map of field paths to user-friendly field names
const fieldNameMap: Record<string, string> = {
  'amount': 'Amount',
  'splits': 'Split details',
  'description': 'Description',
  'date': 'Date',
  'paidById': 'Paid by',
  'paid_by': 'Paid by',
};

/**
 * Formats a single Zod error into a user-friendly message
 */
function formatSingleError(error: z.ZodIssue): string {
  // Get the user-friendly message
  const friendlyMessage = errorMessageMap[error.message] || error.message;
  
  // For nested errors (like splits[0].amount), extract the main field
  const fieldPath = error.path.length > 0 ? String(error.path[0]) : '';
  const friendlyFieldName = fieldNameMap[fieldPath] || fieldPath;
  
  // Don't prepend field name if the message already contains context
  if (friendlyMessage.toLowerCase().includes('please') || 
      friendlyMessage.toLowerCase().includes('must') ||
      friendlyMessage.toLowerCase().includes('this field')) {
    return friendlyMessage;
  }
  
  // Otherwise, prepend the field name for context
  return friendlyFieldName ? `${friendlyFieldName}: ${friendlyMessage}` : friendlyMessage;
}

/**
 * Formats Zod validation errors into user-friendly messages
 */
export function formatValidationErrors(error: unknown): string {
  if (error instanceof z.ZodError) {
    // Group errors by field to avoid duplicate messages
    const uniqueMessages = new Set<string>();
    
    error.errors.forEach(err => {
      const message = formatSingleError(err);
      uniqueMessages.add(message);
    });
    
    // If there's only one unique error, return it directly
    if (uniqueMessages.size === 1) {
      return Array.from(uniqueMessages)[0];
    }
    
    // Otherwise, return a generic message with the first specific error
    return `Please check your input: ${Array.from(uniqueMessages)[0]}`;
  }
  
  // For non-Zod errors, return the message or a generic error
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Creates a user-friendly error message for API responses
 */
export function createFriendlyErrorMessage(error: unknown): string {
  // Handle validation errors
  if (error instanceof z.ZodError) {
    return formatValidationErrors(error);
  }
  
  // Handle known error messages
  if (error instanceof Error) {
    const knownErrors: Record<string, string> = {
      'Network request failed': 'Unable to connect. Please check your internet connection.',
      'Failed to fetch': 'Unable to connect to the server. Please try again.',
      'User not found': 'User account not found. Please try logging in again.',
      'Unauthorized': 'You don\'t have permission to perform this action.',
      'Expense not found': 'This expense no longer exists.',
      'Household not found': 'Unable to find your household.',
    };
    
    for (const [key, friendlyMessage] of Object.entries(knownErrors)) {
      if (error.message.includes(key)) {
        return friendlyMessage;
      }
    }
    
    return error.message;
  }
  
  return 'Something went wrong. Please try again.';
}