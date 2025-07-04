# CoHab UI/UX Revamp Plan

## Executive Summary

This comprehensive plan outlines the transformation of CoHab into a modern, mobile-first household management application. The revamp focuses on creating a delightful user experience through a scalable design system, enhanced performance, and accessibility compliance while maintaining the existing backend logic.

## 1. Design System & Token Architecture

### 1.1 Design Tokens Schema

```typescript
// design-tokens.ts
export const tokens = {
  // Semantic Color Tokens
  colors: {
    // Primary - Household harmony
    primary: {
      50: 'hsl(158, 79%, 97%)',
      100: 'hsl(158, 79%, 94%)',
      200: 'hsl(158, 79%, 88%)',
      300: 'hsl(158, 79%, 77%)',
      400: 'hsl(158, 79%, 58%)',
      500: 'hsl(158, 79%, 45%)', // Main brand color
      600: 'hsl(158, 79%, 35%)',
      700: 'hsl(158, 79%, 28%)',
      800: 'hsl(158, 79%, 23%)',
      900: 'hsl(158, 79%, 20%)',
    },
    // Secondary - Neutral foundation
    secondary: {
      50: 'hsl(210, 40%, 98%)',
      100: 'hsl(210, 40%, 96%)',
      200: 'hsl(210, 40%, 92%)',
      300: 'hsl(210, 40%, 84%)',
      400: 'hsl(210, 40%, 68%)',
      500: 'hsl(210, 40%, 50%)',
      600: 'hsl(210, 40%, 40%)',
      700: 'hsl(210, 40%, 32%)',
      800: 'hsl(210, 40%, 26%)',
      900: 'hsl(210, 40%, 20%)',
    },
    // Accent - Action & attention
    accent: {
      50: 'hsl(16, 100%, 97%)',
      100: 'hsl(16, 100%, 94%)',
      200: 'hsl(16, 100%, 87%)',
      300: 'hsl(16, 100%, 77%)',
      400: 'hsl(16, 100%, 65%)', // Main accent
      500: 'hsl(16, 100%, 55%)',
      600: 'hsl(16, 100%, 47%)',
      700: 'hsl(16, 100%, 40%)',
      800: 'hsl(16, 100%, 33%)',
      900: 'hsl(16, 100%, 28%)',
    },
    // Semantic colors
    success: {
      light: 'hsl(142, 71%, 45%)',
      DEFAULT: 'hsl(142, 71%, 38%)',
      dark: 'hsl(142, 71%, 30%)',
    },
    warning: {
      light: 'hsl(38, 92%, 55%)',
      DEFAULT: 'hsl(38, 92%, 50%)',
      dark: 'hsl(38, 92%, 40%)',
    },
    error: {
      light: 'hsl(0, 84%, 65%)',
      DEFAULT: 'hsl(0, 84%, 60%)',
      dark: 'hsl(0, 84%, 50%)',
    },
    info: {
      light: 'hsl(201, 96%, 45%)',
      DEFAULT: 'hsl(201, 96%, 32%)',
      dark: 'hsl(201, 96%, 25%)',
    },
  },
  
  // Typography System
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace'],
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
      sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
      base: ['1rem', { lineHeight: '1.5rem' }],     // 16px
      lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
      xl: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
      '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }],   // 36px
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
  
  // Spacing System (8px base)
  spacing: {
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
    20: '5rem',     // 80px
  },
  
  // Breakpoints (mobile-first)
  breakpoints: {
    xs: '375px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  
  // Layout
  layout: {
    maxWidth: {
      xs: '20rem',    // 320px
      sm: '24rem',    // 384px
      md: '28rem',    // 448px
      lg: '32rem',    // 512px
      xl: '36rem',    // 576px
      '2xl': '42rem', // 672px
      '3xl': '48rem', // 768px
      '4xl': '56rem', // 896px
      '5xl': '64rem', // 1024px
      '6xl': '72rem', // 1152px
      '7xl': '80rem', // 1280px
      full: '100%',
    },
    radius: {
      none: '0',
      sm: '0.125rem',   // 2px
      DEFAULT: '0.25rem', // 4px
      md: '0.375rem',   // 6px
      lg: '0.5rem',     // 8px
      xl: '0.75rem',    // 12px
      '2xl': '1rem',    // 16px
      '3xl': '1.5rem',  // 24px
      full: '9999px',
    },
  },
  
  // Shadows (elevation system)
  shadows: {
    xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    DEFAULT: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    md: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    lg: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    xl: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  },
  
  // Animation
  animation: {
    duration: {
      instant: '0ms',
      fast: '150ms',
      DEFAULT: '300ms',
      slow: '500ms',
      slower: '700ms',
    },
    easing: {
      linear: 'linear',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
  },
  
  // Z-index layers
  zIndex: {
    base: 0,
    dropdown: 10,
    sticky: 20,
    fixed: 30,
    modalBackdrop: 40,
    modal: 50,
    popover: 60,
    tooltip: 70,
    notification: 80,
    spinner: 90,
  },
};
```

### 1.2 Component Variants System

```typescript
// component-variants.ts
import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  // Base styles
  'inline-flex items-center justify-center font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary: 'bg-primary-500 text-white hover:bg-primary-600 focus-visible:ring-primary-500',
        secondary: 'bg-secondary-100 text-secondary-900 hover:bg-secondary-200 focus-visible:ring-secondary-500',
        accent: 'bg-accent-400 text-white hover:bg-accent-500 focus-visible:ring-accent-400',
        ghost: 'hover:bg-secondary-100 hover:text-secondary-900 focus-visible:ring-secondary-500',
        danger: 'bg-error-DEFAULT text-white hover:bg-error-dark focus-visible:ring-error-DEFAULT',
      },
      size: {
        sm: 'h-9 px-3 text-sm rounded-md',
        md: 'h-11 px-4 text-base rounded-lg',
        lg: 'h-12 px-6 text-lg rounded-lg',
        icon: 'h-11 w-11 rounded-lg',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);
```

## 2. Component Architecture Map

### 2.1 Core Component Library

```
src/
├── components/
│   ├── primitives/           # Base UI components
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Select/
│   │   ├── Checkbox/
│   │   ├── Radio/
│   │   ├── Switch/
│   │   ├── Badge/
│   │   ├── Avatar/
│   │   └── Typography/
│   │
│   ├── layout/              # Layout components
│   │   ├── Container/
│   │   ├── Grid/
│   │   ├── Stack/
│   │   ├── Divider/
│   │   └── Spacer/
│   │
│   ├── feedback/            # User feedback
│   │   ├── Alert/
│   │   ├── Toast/
│   │   ├── Skeleton/
│   │   ├── Spinner/
│   │   └── ProgressBar/
│   │
│   ├── surfaces/            # Surface components
│   │   ├── Card/
│   │   ├── Sheet/
│   │   ├── Modal/
│   │   ├── Drawer/
│   │   └── Popover/
│   │
│   ├── navigation/          # Navigation components
│   │   ├── BottomNav/      # Mobile-first navigation
│   │   ├── TabBar/
│   │   ├── Breadcrumb/
│   │   ├── NavRail/        # Desktop side nav
│   │   └── PageHeader/
│   │
│   └── patterns/            # Common UI patterns
│       ├── EmptyState/
│       ├── ErrorBoundary/
│       ├── InfiniteScroll/
│       ├── PullToRefresh/
│       └── SwipeActions/
```

### 2.2 Feature Component Architecture

```
features/
├── expense/
│   ├── ExpenseCard/
│   ├── ExpenseForm/
│   ├── SplitOptions/
│   ├── SettlementFlow/
│   └── ExpenseHistory/
│
├── chores/
│   ├── ChoreCard/
│   ├── ChoreCalendar/
│   ├── ChoreActions/
│   ├── ChoreScheduler/
│   └── ChoreStats/
│
├── household/
│   ├── MemberList/
│   ├── HouseRules/
│   ├── JoinFlow/
│   └── Settings/
│
└── communication/
    ├── ChatInterface/
    ├── AIAssistant/
    ├── NotificationCenter/
    └── AnnouncementBoard/
```

## 3. Mobile-First Navigation Strategy

### 3.1 Bottom Navigation (Mobile)

```typescript
// BottomNav component structure
const bottomNavItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Receipt, label: 'Expenses', path: '/expenses' },
  { icon: CalendarCheck, label: 'Chores', path: '/chores' },
  { icon: MessageSquare, label: 'Chat', path: '/chat' },
  { icon: Menu, label: 'More', action: 'sheet' },
];
```

### 3.2 Progressive Enhancement for Desktop

- Mobile: Bottom navigation + drawer for secondary items
- Tablet: Side rail navigation with icons + labels
- Desktop: Full sidebar with nested navigation

## 4. Sample Refactored Screen: Expense Splitter

### 4.1 Mobile-First Expense Flow

```typescript
// ExpenseSplitterV3.tsx - Mobile-optimized version
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/primitives/Button';
import { Sheet } from '@/components/surfaces/Sheet';
import { SwipeableCard } from '@/components/patterns/SwipeableCard';

export const ExpenseSplitterV3: React.FC = () => {
  const [step, setStep] = useState<'details' | 'split' | 'review'>('details');
  
  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Mobile-optimized header */}
      <header className="sticky top-0 z-sticky bg-white border-b border-secondary-200">
        <div className="flex items-center justify-between px-4 h-14">
          <button className="p-2 -ml-2 rounded-lg hover:bg-secondary-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-lg">Add Expense</h1>
          <button className="text-primary-500 font-medium">
            Save
          </button>
        </div>
        
        {/* Progress indicator */}
        <div className="flex gap-2 px-4 pb-3">
          {['details', 'split', 'review'].map((s, i) => (
            <div
              key={s}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                step === s ? 'bg-primary-500' : 'bg-secondary-200'
              )}
            />
          ))}
        </div>
      </header>
      
      {/* Animated step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="px-4 py-6"
        >
          {step === 'details' && <ExpenseDetailsStep />}
          {step === 'split' && <ExpenseSplitStep />}
          {step === 'review' && <ExpenseReviewStep />}
        </motion.div>
      </AnimatePresence>
      
      {/* Fixed bottom action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-secondary-200">
        <Button
          fullWidth
          size="lg"
          onClick={() => {
            if (step === 'details') setStep('split');
            else if (step === 'split') setStep('review');
            else handleSubmit();
          }}
        >
          {step === 'review' ? 'Add Expense' : 'Continue'}
        </Button>
      </div>
    </div>
  );
};

// Expense Details Step with mobile-optimized inputs
const ExpenseDetailsStep: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium text-secondary-700 mb-2 block">
          What's this expense for?
        </label>
        <input
          type="text"
          placeholder="e.g., Groceries, Utilities"
          className="w-full px-4 py-3 rounded-xl border border-secondary-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-lg"
          autoFocus
        />
      </div>
      
      <div>
        <label className="text-sm font-medium text-secondary-700 mb-2 block">
          Amount
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-500 text-lg">
            $
          </span>
          <input
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            className="w-full pl-8 pr-4 py-3 rounded-xl border border-secondary-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-2xl font-semibold"
          />
        </div>
      </div>
      
      <div>
        <label className="text-sm font-medium text-secondary-700 mb-2 block">
          Category
        </label>
        <div className="grid grid-cols-3 gap-3">
          {['Food', 'Utilities', 'Rent', 'Supplies', 'Entertainment', 'Other'].map((cat) => (
            <button
              key={cat}
              className="px-4 py-3 rounded-xl border border-secondary-300 hover:border-primary-500 hover:bg-primary-50 transition-all"
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
```

### 4.2 Gesture-Based Interactions

```typescript
// SwipeableExpenseCard.tsx
import { useSwipeable } from 'react-swipeable';

export const SwipeableExpenseCard: React.FC<{ expense: Expense }> = ({ expense }) => {
  const [offset, setOffset] = useState(0);
  
  const handlers = useSwipeable({
    onSwiping: (eventData) => {
      setOffset(eventData.deltaX);
    },
    onSwipedLeft: () => {
      if (Math.abs(offset) > 100) {
        handleDelete();
      } else {
        setOffset(0);
      }
    },
    onSwipedRight: () => {
      if (offset > 100) {
        handleSettle();
      } else {
        setOffset(0);
      }
    },
    trackMouse: false,
  });
  
  return (
    <div className="relative overflow-hidden">
      {/* Background actions */}
      <div className="absolute inset-0 flex">
        <div className="flex-1 bg-success-light flex items-center px-4">
          <CheckCircle className="w-6 h-6 text-white" />
          <span className="ml-2 text-white font-medium">Settle</span>
        </div>
        <div className="flex-1 bg-error-DEFAULT flex items-center justify-end px-4">
          <span className="mr-2 text-white font-medium">Delete</span>
          <Trash2 className="w-6 h-6 text-white" />
        </div>
      </div>
      
      {/* Swipeable card */}
      <motion.div
        {...handlers}
        animate={{ x: offset }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative bg-white rounded-xl p-4 shadow-sm"
      >
        <ExpenseCardContent expense={expense} />
      </motion.div>
    </div>
  );
};
```

## 5. Performance Optimization Strategy

### 5.1 Core Web Vitals Targets

- **LCP (Largest Contentful Paint)**: < 2.5s (target: < 2s for mobile)
- **FID (First Input Delay)**: < 100ms (target: < 50ms)
- **CLS (Cumulative Layout Shift)**: < 0.1 (target: < 0.05)
- **FCP (First Contentful Paint)**: < 1.8s (target: < 1.5s on 4G)

### 5.2 Implementation Techniques

```typescript
// 1. Route-based code splitting
const ExpenseModule = lazy(() => 
  import(/* webpackChunkName: "expense" */ './features/expense')
);

// 2. Image optimization with blur placeholders
import Image from 'next/image';

<Image
  src={avatarUrl}
  alt={userName}
  width={40}
  height={40}
  placeholder="blur"
  blurDataURL={blurDataUrl}
  priority={isAboveFold}
/>

// 3. Virtualized lists for large datasets
import { VirtualList } from '@tanstack/react-virtual';

// 4. Optimistic UI updates
const optimisticUpdate = async (newExpense: Expense) => {
  // Update UI immediately
  setExpenses(prev => [...prev, { ...newExpense, pending: true }]);
  
  try {
    const saved = await saveExpense(newExpense);
    setExpenses(prev => 
      prev.map(e => e.id === newExpense.id ? saved : e)
    );
  } catch (error) {
    // Revert on error
    setExpenses(prev => prev.filter(e => e.id !== newExpense.id));
    toast.error('Failed to save expense');
  }
};
```

## 6. Accessibility Implementation

### 6.1 WCAG 2.2 AA Compliance Checklist

- [ ] All interactive elements have 44x44px minimum touch targets
- [ ] Color contrast ratios: 4.5:1 for normal text, 3:1 for large text
- [ ] Focus indicators visible and high contrast
- [ ] Keyboard navigation fully supported
- [ ] Screen reader announcements for dynamic content
- [ ] Form validation with clear error messages
- [ ] Reduced motion options respected

### 6.2 Implementation Examples

```typescript
// Accessible modal with focus trap
import { FocusTrap } from '@headlessui/react';

export const AccessibleModal: React.FC = ({ isOpen, onClose, children }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <Portal>
          <FocusTrap>
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-title"
              className="fixed inset-0 z-modal flex items-center justify-center p-4"
            >
              {/* Backdrop with escape key handler */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                onKeyDown={(e) => e.key === 'Escape' && onClose()}
                className="absolute inset-0 bg-black/50"
                aria-hidden="true"
              />
              
              {/* Modal content */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-auto"
              >
                {children}
              </motion.div>
            </div>
          </FocusTrap>
        </Portal>
      )}
    </AnimatePresence>
  );
};

// Skip navigation link
export const SkipToContent: React.FC = () => (
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary-500 text-white px-4 py-2 rounded-lg z-notification"
  >
    Skip to main content
  </a>
);
```

## 7. Progressive Web App (PWA) Implementation

### 7.1 PWA Configuration

```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.cohab\.app\/api/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24, // 24 hours
        },
      },
    },
  ],
});

// manifest.json
{
  "name": "CoHab - Household Management",
  "short_name": "CoHab",
  "description": "Manage your household expenses, chores, and communication",
  "theme_color": "#10b981",
  "background_color": "#ffffff",
  "display": "standalone",
  "orientation": "portrait",
  "scope": "/",
  "start_url": "/",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 7.2 Offline Support

```typescript
// hooks/useOfflineSync.ts
export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActions, setPendingActions] = useState<Action[]>([]);
  
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingActions();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast.info('You\'re offline. Changes will sync when reconnected.');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  const queueAction = (action: Action) => {
    if (!isOnline) {
      setPendingActions(prev => [...prev, action]);
      localStorage.setItem('pendingActions', JSON.stringify([...pendingActions, action]));
    }
  };
  
  return { isOnline, queueAction };
};
```

## 8. Micro-interactions & Delight

### 8.1 Interaction Patterns

```typescript
// Haptic feedback for mobile
const useHapticFeedback = () => {
  const vibrate = (pattern: number | number[] = 10) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };
  
  return { vibrate };
};

// Pull-to-refresh implementation
const PullToRefresh: React.FC = ({ onRefresh, children }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const handlers = useSwipeable({
    onSwiping: (eventData) => {
      if (eventData.dir === 'Down' && window.scrollY === 0) {
        setPullDistance(Math.min(eventData.deltaY, 100));
      }
    },
    onSwiped: async () => {
      if (pullDistance > 60) {
        setIsRefreshing(true);
        await onRefresh();
        setIsRefreshing(false);
      }
      setPullDistance(0);
    },
  });
  
  return (
    <div {...handlers}>
      <motion.div
        animate={{ y: pullDistance }}
        className="relative"
      >
        {pullDistance > 0 && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2">
            <Loader2 
              className={cn(
                "w-6 h-6 text-primary-500",
                isRefreshing && "animate-spin"
              )}
            />
          </div>
        )}
        {children}
      </motion.div>
    </div>
  );
};
```

### 8.2 Delightful Animations

```typescript
// Success celebration animation
const SuccessAnimation: React.FC = () => {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: [0, 1.2, 1] }}
      transition={{ duration: 0.5, type: "spring" }}
      className="w-20 h-20 rounded-full bg-success-light flex items-center justify-center"
    >
      <motion.div
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        <CheckIcon className="w-10 h-10 text-white" />
      </motion.div>
    </motion.div>
  );
};

// Skeleton loading with shimmer effect
const SkeletonLoader: React.FC = () => {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="h-20 bg-secondary-200 rounded-xl overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
};
```

## 9. KPI Measurement Strategy

### 9.1 Key Performance Indicators

```typescript
// analytics/kpi-tracker.ts
export const KPITargets = {
  userEngagement: {
    nps: { target: 60, current: null },
    dailyActiveUsers: { target: 0.7, current: null }, // 70% DAU/MAU
    sessionDuration: { target: 300, current: null }, // 5 minutes
  },
  
  technicalPerformance: {
    mobileFCP: { target: 1500, current: null }, // 1.5s
    desktopFCP: { target: 1000, current: null }, // 1s
    errorRate: { target: 0.01, current: null }, // < 1%
    crashRate: { target: 0.001, current: null }, // < 0.1%
  },
  
  businessMetrics: {
    taskCompletionRate: { target: 0.85, current: null }, // 85%
    featureAdoption: {
      expenses: { target: 0.9, current: null },
      chores: { target: 0.8, current: null },
      chat: { target: 0.7, current: null },
    },
    userRetention: {
      day1: { target: 0.8, current: null },
      day7: { target: 0.6, current: null },
      day30: { target: 0.4, current: null },
    },
  },
  
  accessibility: {
    wcagCompliance: { target: 1.0, current: null }, // 100%
    keyboardNavigation: { target: 1.0, current: null },
    screenReaderSupport: { target: 1.0, current: null },
  },
};

// Implementation example
export const trackKPI = (metric: string, value: number) => {
  // Send to analytics service
  analytics.track('kpi_measurement', {
    metric,
    value,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
  });
};
```

### 9.2 A/B Testing Framework

```typescript
// hooks/useExperiment.ts
export const useExperiment = (experimentId: string) => {
  const [variant, setVariant] = useState<'control' | 'treatment'>('control');
  
  useEffect(() => {
    const assignedVariant = getVariantAssignment(experimentId, userId);
    setVariant(assignedVariant);
    
    analytics.track('experiment_exposure', {
      experimentId,
      variant: assignedVariant,
      userId,
    });
  }, [experimentId, userId]);
  
  return variant;
};

// Usage in component
const ExpenseForm: React.FC = () => {
  const variant = useExperiment('expense_flow_v2');
  
  return variant === 'treatment' ? (
    <ExpenseFormV2 /> // New stepped flow
  ) : (
    <ExpenseFormV1 /> // Current single-page flow
  );
};
```

## 10. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
1. Set up design token system
2. Create core primitive components
3. Implement accessibility utilities
4. Set up performance monitoring

### Phase 2: Core Features (Weeks 3-4)
1. Refactor navigation to mobile-first approach
2. Implement gesture-based interactions
3. Create responsive modal system
4. Add skeleton loading states

### Phase 3: Feature Enhancement (Weeks 5-6)
1. Refactor Expense Splitter with new UX
2. Enhance Chore Hub for mobile
3. Optimize chat interface
4. Implement offline support

### Phase 4: Polish & Optimization (Weeks 7-8)
1. Add micro-interactions and animations
2. Implement PWA features
3. Performance optimization pass
4. A/B testing setup

### Phase 5: Measurement & Iteration (Ongoing)
1. Deploy analytics tracking
2. Monitor KPIs
3. User testing sessions
4. Iterative improvements

## 11. PR Strategy for Incremental Changes

### 11.1 PR Structure Template

```markdown
## PR Title: [Component/Feature] Brief description

### What changed?
- Bullet points of specific changes
- Before/after screenshots for UI changes

### Why?
- Business or UX rationale
- Performance improvements
- Accessibility enhancements

### Testing
- [ ] Manual testing on mobile devices
- [ ] Accessibility audit passed
- [ ] Performance metrics captured
- [ ] Unit tests updated

### Metrics Impact
- Expected impact on KPIs
- A/B test configuration (if applicable)
```

### 11.2 PR Size Guidelines

- **Small PRs**: Single component refactor (< 200 lines)
- **Medium PRs**: Feature module refactor (200-500 lines)
- **Large PRs**: New system implementation (> 500 lines, requires design review)

## 12. Conclusion

This comprehensive UI/UX revamp plan transforms CoHab into a modern, performant, and delightful household management application. By focusing on mobile-first design, accessibility, and user engagement, we'll create an experience that users love to use daily.

The incremental implementation approach ensures we can ship improvements continuously while maintaining stability and gathering user feedback along the way.