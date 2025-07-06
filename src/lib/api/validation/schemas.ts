// src/lib/api/validation/schemas.ts
import { z } from 'zod';
import { formatValidationErrors } from '../../utils/errorFormatter';

// First, create the ValidationError class in the same file or import it
export class ValidationError extends Error {
  constructor(public errors: z.ZodIssue[]) {
    super('Validation failed');
    this.name = 'ValidationError';
    
    // Use the friendly error formatter
    this.message = formatValidationErrors({ errors } as z.ZodError);
  }
}

// Common schemas
export const uuidSchema = z.string().uuid('Invalid ID format');
export const emailSchema = z.string().email('Invalid email format');
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)');
export const amountSchema = z.number().nonnegative().max(999999.99, 'Amount too large');
export const percentageSchema = z.number().min(0).max(100, 'Percentage must be between 0 and 100');

// User schemas
export const profileSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(100),
  avatar_url: z.string().url().nullable().optional(),
  email: emailSchema.optional(),
  vacation_start_date: dateSchema.nullable().optional(),
  vacation_end_date: dateSchema.nullable().optional()
});

// Household schemas
export const householdRoleSchema = z.enum(['admin', 'member']);
export const choreFrequencySchema = z.enum(['Daily', 'Weekly', 'Bi-weekly', 'Monthly']);
export const choreFrameworkSchema = z.enum(['Split', 'One person army']);

export const createHouseholdSchema = z.object({
  name: z.string().min(1).max(100, 'Household name too long'),
  member_count: z.number().int().positive().max(20, 'Too many members'),
  core_chores: z.array(z.string()).max(10).optional(),
  chore_frequency: choreFrequencySchema.optional(),
  chore_framework: choreFrameworkSchema.optional()
});

// Task schemas
export const createTaskSchema = z.object({
  householdId: uuidSchema,
  title: z.string().min(1).max(200, 'Task title too long'),
  assignedTo: uuidSchema.optional()
});

// Expense schemas
export const expenseSplitSchema = z.object({
  user_id: uuidSchema,
  amount: amountSchema
});

export const createExpenseSchema = z.object({
  householdId: uuidSchema,
  description: z.string().min(1).max(200, 'Description too long'),
  amount: amountSchema,
  splits: z.array(expenseSplitSchema).min(1).max(50),
  date: dateSchema.optional(),
  paidById: uuidSchema.optional()
});

// Update expense schema (for partial updates)
export const updateExpenseSchema = z.object({
  description: z.string().min(1).max(200, 'Description too long'),
  amount: amountSchema,
  splits: z.array(expenseSplitSchema).min(1).max(50),
  paid_by: uuidSchema,
  date: dateSchema
});

// Settlement schemas
export const createSettlementSchema = z.object({
  household_id: uuidSchema,
  payer_id: uuidSchema,
  payee_id: uuidSchema,
  amount: amountSchema,
  description: z.string().max(500).optional()
}).refine(data => data.payer_id !== data.payee_id, {
  message: "Cannot create a payment to yourself"
});

// Chore schemas
export const choreStatusSchema = z.enum(['pending', 'completed', 'missed', 'skipped']);

export const createChoreSchema = z.object({
  householdId: uuidSchema,
  name: z.string().min(1).max(100, 'Chore name too long'),
  description: z.string().max(500).optional()
});

// Message schemas
export const sendMessageSchema = z.object({
  householdId: uuidSchema,
  content: z.string().min(1).max(1000, 'Message too long')
});

// Join code schema
export const joinCodeSchema = z.string().length(4).regex(/^[A-Z0-9]{4}$/, 'Invalid join code format');

// Recurring expense schemas
export const recurringFrequencySchema = z.enum(['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']);

export const createRecurringExpenseSchema = z.object({
  householdId: uuidSchema,
  description: z.string().min(1).max(200),
  amount: amountSchema,
  frequency: recurringFrequencySchema,
  startDate: z.date(),
  dayOfMonth: z.number().min(1).max(31).optional()
});

// House rules schema
export const houseRuleSchema = z.object({
  category: z.string().min(1).max(50, 'Category too long'),
  content: z.string().min(1).max(1000, 'Rule content too long')
});

// Validation helpers
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(error.errors);
    }
    throw error;
  }
}

// Fixed version - constrained to ZodObject types only
export function validatePartialInput<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  data: unknown
): Partial<z.infer<z.ZodObject<T>>> {
  try {
    return schema.partial().parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(error.errors);
    }
    throw error;
  }
}

// Alternative: Create specific partial schemas where needed
export const updateHouseholdSchema = createHouseholdSchema.partial();
export const updateTaskSchema = createTaskSchema.partial();
export const updateProfileSchema = profileSchema.partial();

// Safe validation with default values
export function validateWithDefaults<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  defaults: Partial<T>
): T {
  try {
    const merged = { ...defaults, ...(typeof data === 'object' && data !== null ? data : {}) };
    return schema.parse(merged);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(error.errors);
    }
    throw error;
  }
}

// Type inference helpers
export type CreateHouseholdInput = z.infer<typeof createHouseholdSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type CreateSettlementInput = z.infer<typeof createSettlementSchema>;
export type CreateChoreInput = z.infer<typeof createChoreSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateRecurringExpenseInput = z.infer<typeof createRecurringExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;