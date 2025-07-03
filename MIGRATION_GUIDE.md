# CoHab UI/UX Migration Guide

This guide explains how to migrate existing components to the new design system.

## 1. Using the New Layout

Replace the existing Layout component with LayoutV2:

```tsx
// Before
import { Layout } from './Layout';

// After
import { LayoutV2 } from './LayoutV2';

// In your component
<LayoutV2
  title="Expenses"
  showBack={true}
  onBack={() => router.back()}
  isHouseholdView={true}
>
  {/* Your content */}
</LayoutV2>
```

## 2. Button Component Migration

Replace existing buttons with the new Button component:

```tsx
// Before
<button className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700">
  Add Expense
</button>

// After
import { Button } from '@/components/primitives/Button';

<Button variant="primary" size="md">
  Add Expense
</Button>

// With loading state
<Button loading={isLoading} disabled={!isValid}>
  Save Changes
</Button>

// Icon button
<Button variant="ghost" size="icon" aria-label="Edit">
  <Edit className="h-4 w-4" />
</Button>
```

## 3. Input Component Migration

Replace input fields with the new Input component:

```tsx
// Before
<input
  type="text"
  className="border rounded px-3 py-2 w-full"
  placeholder="Enter amount"
/>

// After
import { Input } from '@/components/primitives/Input';

<Input
  type="number"
  inputMode="decimal"
  placeholder="0.00"
  leftIcon={<DollarSign className="h-5 w-5" />}
  inputSize="lg"
  value={amount}
  onChange={(e) => setAmount(e.target.value)}
/>

// With error state
<Input
  type="email"
  error={!!errors.email}
  placeholder="Email address"
/>
```

## 4. Card Component Usage

Replace custom card implementations:

```tsx
// Before
<div className="bg-white rounded-lg shadow p-4">
  <h3 className="font-semibold">Expense Summary</h3>
  <p className="text-gray-600">Total: $150.00</p>
</div>

// After
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/surfaces/Card';

<Card variant="elevated">
  <CardHeader>
    <CardTitle>Expense Summary</CardTitle>
    <CardDescription>This month's breakdown</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Total: $150.00</p>
  </CardContent>
</Card>
```

## 5. Modal Component Migration

Replace existing modals with the new Modal component:

```tsx
// Before
{showModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
    <div className="bg-white rounded-lg p-6">
      {/* Modal content */}
    </div>
  </div>
)}

// After
import { Modal } from '@/components/surfaces/Modal';

<Modal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Add Expense"
  description="Enter the details for your new expense"
>
  {/* Modal content */}
</Modal>
```

## 6. Using Skeleton Loaders

Add skeleton loaders for better perceived performance:

```tsx
import { Skeleton, SkeletonCard } from '@/components/feedback/Skeleton';

// Loading state for a list
{isLoading ? (
  <div className="space-y-4">
    {[...Array(3)].map((_, i) => (
      <SkeletonCard key={i} showMedia={false} />
    ))}
  </div>
) : (
  <ExpenseList expenses={expenses} />
)}

// Loading state for text
{isLoading ? (
  <Skeleton variant="text" width="60%" />
) : (
  <h2>{title}</h2>
)}
```

## 7. Implementing the New ExpenseSplitter

Replace ExpenseSplitterV2 with ExpenseSplitterV3:

```tsx
import { ExpenseSplitterV3 } from '@/components/ExpenseSplitterV3';

<ExpenseSplitterV3
  householdMembers={members}
  currentUserId={user.id}
  onAddExpense={handleAddExpense}
  onCancel={() => setShowExpenseForm(false)}
/>
```

## 8. Design Token Usage

Use design tokens for consistent styling:

```tsx
// Import tokens
import { tokens } from '@/lib/design-tokens';

// In styled components or inline styles
<div
  style={{
    padding: tokens.spacing[4],
    borderRadius: tokens.layout.radius.lg,
    boxShadow: tokens.shadows.md,
  }}
>
  {/* Content */}
</div>

// With Tailwind classes
<div className="p-4 rounded-lg shadow-md">
  {/* Same effect using Tailwind with our custom tokens */}
</div>
```

## 9. Accessibility Improvements

Add accessibility features to your components:

```tsx
// Skip to content link (added automatically in LayoutV2)
import { SkipToContent } from '@/components/accessibility';

// Focus trap for modals (handled automatically in Modal component)
import { FocusTrap } from '@/components/accessibility';

// Proper ARIA labels
<Button
  variant="icon"
  aria-label="Delete expense"
  onClick={handleDelete}
>
  <Trash2 className="h-4 w-4" />
</Button>

// Keyboard navigation
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>
  Interactive element
</div>
```

## 10. Mobile-First Patterns

Implement mobile-first patterns:

```tsx
// Responsive text sizing
<h1 className="text-lg md:text-xl lg:text-2xl">

// Touch-friendly tap targets (minimum 44x44px)
<Button size="md"> {/* 44px height on mobile */}

// Mobile-optimized forms
<form className="space-y-4">
  <Input
    type="tel"
    inputMode="numeric"
    pattern="[0-9]*"
    placeholder="Phone number"
  />
</form>

// Bottom sheets on mobile, centered modals on desktop
<Modal size="full" className="sm:max-w-md">
```

## Migration Checklist

- [ ] Replace Layout with LayoutV2
- [ ] Update all buttons to use Button component
- [ ] Update all inputs to use Input component
- [ ] Replace custom cards with Card component
- [ ] Implement Modal component for all dialogs
- [ ] Add skeleton loaders for loading states
- [ ] Update color classes to use new tokens
- [ ] Ensure all interactive elements have 44px touch targets
- [ ] Add proper ARIA labels and keyboard navigation
- [ ] Test on mobile devices and screen readers
- [ ] Run Lighthouse audit and fix any issues
- [ ] Update ExpenseSplitter to V3

## Performance Optimizations

1. **Lazy load components**:
```tsx
const ExpenseChart = lazy(() => import('./ExpenseChart'));
```

2. **Use skeleton loaders**:
```tsx
<Suspense fallback={<SkeletonCard />}>
  <ExpenseChart />
</Suspense>
```

3. **Optimize images**:
```tsx
import Image from 'next/image';

<Image
  src={avatarUrl}
  alt={userName}
  width={40}
  height={40}
  loading="lazy"
/>
```

4. **Implement virtual scrolling for long lists**:
```tsx
// Coming soon with @tanstack/react-virtual
```

## Testing Your Migration

1. **Mobile Testing**:
   - Test on real devices (iOS Safari, Chrome Android)
   - Use Chrome DevTools device emulation
   - Check touch interactions and gestures

2. **Accessibility Testing**:
   - Use keyboard navigation (Tab, Enter, Escape)
   - Test with screen readers (NVDA, JAWS, VoiceOver)
   - Run axe DevTools extension

3. **Performance Testing**:
   - Run Lighthouse audits
   - Check Core Web Vitals
   - Monitor bundle size

## Getting Help

If you encounter any issues during migration:
1. Check the component documentation in `/src/components/[component]/README.md`
2. Review the design tokens in `/src/lib/design-tokens.ts`
3. Look at the example implementations in this guide

Remember to make incremental changes and test thoroughly at each step!