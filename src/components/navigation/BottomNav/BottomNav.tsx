import * as React from 'react';
import { Home, Receipt, CalendarCheck, MessageSquare, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export type NavItemId = 'home' | 'expenses' | 'chores' | 'chat' | 'more';

interface NavItem {
  id: NavItemId;
  icon: React.ElementType;
  label: string;
}

const bottomNavItems: NavItem[] = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'expenses', icon: Receipt, label: 'Expenses' },
  { id: 'chores', icon: CalendarCheck, label: 'Chores' },
  { id: 'chat', icon: MessageSquare, label: 'Chat' },
  { id: 'more', icon: Menu, label: 'More' },
];

interface BottomNavProps {
  activeItem: NavItemId;
  onNavigate: (item: NavItemId) => void;
  onMenuClick?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeItem, onNavigate, onMenuClick }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-fixed border-t border-secondary-200 bg-white px-2 pb-safe md:hidden">
      <div className="flex items-center justify-around">
        {bottomNavItems.map((item) => {
          const isActive = activeItem === item.id;
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'more') {
                  onMenuClick?.();
                } else {
                  onNavigate(item.id);
                }
              }}
              className={cn(
                'relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-secondary-600 transition-colors active:scale-95',
                isActive && 'text-primary-500'
              )}
            >
              {isActive && item.id !== 'more' && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute inset-0 bg-primary-50"
                  initial={false}
                  transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 30,
                  }}
                />
              )}
              <Icon className={cn('relative h-5 w-5', isActive && 'text-primary-500')} />
              <span className={cn('relative text-xs font-medium', isActive && 'text-primary-500')}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export const BottomNavSpacer: React.FC = () => {
  return <div className="h-14 md:hidden" />;
};