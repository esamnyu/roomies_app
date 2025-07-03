# Household Management App - UX Analysis & User Flow Documentation

## Overview
This is a comprehensive household management app built with Next.js, React, and Supabase. The app helps roommates manage expenses, chores, communication, and house rules collaboratively.

## Main User Flows

### 1. **Authentication & Onboarding Flow**
- **Landing Page** → Sign In/Sign Up
- **New User Flow**:
  - Sign Up → Onboarding Choice (Create or Join Household)
  - Create: Household Setup Form → Welcome Screen → Dashboard
  - Join: Enter 4-character code → Welcome Screen → Dashboard
- **Existing User**: Sign In → Dashboard (list of households)

### 2. **Expense Management Flow**
- **ExpenseSplitterV2 Component** handles expense splitting
- Three split types: Equal, Custom amounts, Percentage-based
- Features:
  - Visual member selection with checkboxes
  - Real-time split calculations
  - Validation feedback
  - Support for custom amounts per person
- **Settlement Flow**: SettleUpModalV2 provides intelligent suggestions for settling balances

### 3. **Chore Management (ChoreHub)**
- **Main Features**:
  - Calendar view (draggable and simple modes)
  - Due soon tasks section
  - Upcoming rotations
  - Recent activity history
- **Admin Controls**:
  - Add/manage chores
  - Generate automatic schedules
  - Drag-and-drop rescheduling
- **User Actions**:
  - Mark chores complete
  - Quick actions menu (snooze, swap, delegate)
  - Visual task cards with status indicators

### 4. **Communication Hub**
- **Dual-mode chat**: Household group chat + AI assistant
- **AI Assistant (AIMateChat-RAG)**:
  - Real-time access to household data
  - Suggested prompts for common questions
  - Markdown support for responses
  - Context-aware responses about expenses, chores, and household info

### 5. **Household Management**
- **Setup Flow**: Name, member count, core chores, frequency, framework
- **Settings**: Admin can manage join codes, members, and household details
- **House Rules**: Add/edit/delete rules with categories

## Design Patterns & Components

### Responsive Design Implementation
- **Breakpoints**: Uses Tailwind CSS (sm:, md:, lg:, xl:)
- **Mobile-first approach** with progressive enhancement
- **Key responsive patterns**:
  - Grid layouts: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
  - Flex direction changes: `flex-col lg:flex-row`
  - Hidden/visible elements: `hidden md:flex`
  - Mobile menu for navigation

### Component Architecture
- **Modular design** with reusable UI components
- **Modal system** for complex interactions
- **Provider pattern** for state management (AuthProvider, ChoreProvider)
- **Error boundaries** for resilience

## Identified UX Issues & Mobile Concerns

### 1. **Mobile Navigation Issues**
- **Problem**: Complex nested navigation (Dashboard → Household → Tabs)
- **Impact**: Users get lost in deep navigation hierarchies
- **Solution**: Add breadcrumbs or simplified mobile navigation

### 2. **Modal Overflow on Mobile**
- **Problem**: Fixed modals with `max-w-2xl` can overflow on small screens
- **Current**: `fixed inset-0` with `p-4` padding
- **Solution**: Need better mobile modal handling with full-screen options

### 3. **Touch Target Sizes**
- **Problem**: Some interactive elements too small for mobile
- **Examples**: 
  - ChoreTaskCard quick actions menu button
  - Checkbox inputs in expense splitter
  - Tab navigation buttons
- **Solution**: Increase touch targets to minimum 44x44px

### 4. **Information Density**
- **Problem**: Dense layouts on ChoreHub and expense lists
- **Impact**: Difficult to parse on small screens
- **Solution**: Progressive disclosure, expandable cards

### 5. **Form Input Experience**
- **Problem**: Multi-step forms not optimized for mobile
- **Examples**: 
  - HouseholdSetupForm with dropdown selects
  - ExpenseSplitter with numeric inputs
- **Solution**: Mobile-optimized input types, better keyboard handling

### 6. **Loading States**
- **Good**: Consistent LoadingSpinner component
- **Issue**: No skeleton screens for better perceived performance
- **Solution**: Add content placeholders

### 7. **Error Handling**
- **Good**: Toast notifications for actions
- **Issue**: Error messages can be truncated on mobile
- **Solution**: Responsive error displays

### 8. **Gesture Support**
- **Missing**: No swipe gestures for common actions
- **Opportunity**: Swipe to complete chores, dismiss modals

### 9. **Offline Support**
- **Issue**: No offline capability
- **Impact**: App unusable without connection
- **Solution**: Progressive Web App features, local caching

## Design Inconsistencies

### 1. **Button Variations**
- Multiple button styles and sizes used inconsistently
- Some use icons, others don't
- Inconsistent spacing and padding

### 2. **Color Usage**
- Status colors vary between components
- Overdue: Sometimes red-500, sometimes red-600
- Success states inconsistent

### 3. **Typography**
- Font sizes and weights not following clear hierarchy
- Headers range from text-lg to text-3xl without pattern

### 4. **Card Designs**
- Different shadow, border, and radius treatments
- Some use `shadow-sm`, others `shadow-md`
- Border colors inconsistent

### 5. **Icon Usage**
- Mix of Lucide icons and inline SVGs
- Inconsistent icon sizes (h-4 w-4 vs h-5 w-5)

## Recommendations

### Immediate Fixes
1. **Standardize touch targets** for all interactive elements
2. **Fix modal responsiveness** with mobile-specific layouts
3. **Improve form inputs** with proper mobile keyboards
4. **Create design system** for consistent components

### Medium-term Improvements
1. **Add skeleton screens** for better loading experience
2. **Implement swipe gestures** for common actions
3. **Create mobile-first navigation** pattern
4. **Add progressive disclosure** for complex data

### Long-term Enhancements
1. **PWA implementation** for offline support
2. **Performance optimization** with code splitting
3. **Accessibility audit** and improvements
4. **User testing** on actual mobile devices

## Technical Debt
- Some components are very large (RoomiesApp.tsx has 829 lines)
- Inline styles mixed with Tailwind classes
- Repeated code patterns that could be abstracted
- Limited error boundaries usage

## Conclusion
The app has solid functionality but needs significant mobile UX improvements. The desktop experience is well-thought-out, but mobile users face navigation challenges, dense layouts, and interaction difficulties. A mobile-first redesign of key flows would greatly improve the user experience.