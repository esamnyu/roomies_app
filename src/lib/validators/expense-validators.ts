import { z } from 'zod';

// Payment schema for multi-payer support
export const PaymentSchema = z.object({
  payer_id: z.string().uuid(),
  amount: z.number().positive().multipleOf(0.01)
});

// Split schema
export const SplitSchema = z.object({
  user_id: z.string().uuid(),
  amount: z.number().positive().multipleOf(0.01)
});

// Create expense request schema
export const CreateExpenseSchema = z.object({
  household_id: z.string().uuid(),
  description: z.string().min(1).max(255),
  amount: z.number().positive().multipleOf(0.01),
  payments: z.array(PaymentSchema).min(1),
  splits: z.array(SplitSchema).min(1),
  date: z.string().datetime().optional(),
  client_uuid: z.string().uuid().optional(),
  recurring_expense_id: z.string().uuid().optional()
}).refine((data) => {
  // Validate payment sum equals amount
  const paymentSum = data.payments.reduce((sum, p) => sum + p.amount, 0);
  return Math.abs(paymentSum - data.amount) < 0.01;
}, {
  message: "Payment amounts must sum to the total expense amount"
}).refine((data) => {
  // Validate split sum equals amount
  const splitSum = data.splits.reduce((sum, s) => sum + s.amount, 0);
  return Math.abs(splitSum - data.amount) < 0.01;
}, {
  message: "Split amounts must sum to the total expense amount"
});

// Update expense request schema
export const UpdateExpenseSchema = z.object({
  expense_id: z.string().uuid(),
  description: z.string().min(1).max(255),
  amount: z.number().positive().multipleOf(0.01),
  payments: z.array(PaymentSchema).min(1),
  splits: z.array(SplitSchema).min(1),
  date: z.string().datetime(),
  expected_version: z.number().int().optional()
}).refine((data) => {
  const paymentSum = data.payments.reduce((sum, p) => sum + p.amount, 0);
  return Math.abs(paymentSum - data.amount) < 0.01;
}, {
  message: "Payment amounts must sum to the total expense amount"
}).refine((data) => {
  const splitSum = data.splits.reduce((sum, s) => sum + s.amount, 0);
  return Math.abs(splitSum - data.amount) < 0.01;
}, {
  message: "Split amounts must sum to the total expense amount"
});

// Recurring expense schema
export const RecurringExpenseSchema = z.object({
  household_id: z.string().uuid(),
  description: z.string().min(1).max(255),
  amount: z.number().positive().multipleOf(0.01),
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']),
  day_of_month: z.number().int().min(1).max(31).optional(),
  day_of_week: z.number().int().min(0).max(6).optional(),
  splits: z.array(SplitSchema).optional()
});

// Types
export type Payment = z.infer<typeof PaymentSchema>;
export type Split = z.infer<typeof SplitSchema>;
export type CreateExpenseRequest = z.infer<typeof CreateExpenseSchema>;
export type UpdateExpenseRequest = z.infer<typeof UpdateExpenseSchema>;
export type RecurringExpenseRequest = z.infer<typeof RecurringExpenseSchema>;