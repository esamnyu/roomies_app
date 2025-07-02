import * as React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Receipt, CalendarCheck, MessageSquare, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path?: string;
  action?: string;
}

const bottomNavItems: NavItem[] = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Receipt, label: 'Expenses', path: '/expenses' },
  { icon: CalendarCheck, label: 'Chores', path: '/chores' },
  { icon: MessageSquare, label: 'Chat', path: '/chat' },
  { icon: Menu, label: 'More', action: 'sheet' },
];

interface BottomNavProps {
  onMenuClick?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onMenuClick }) => {
  const pathname = usePathname();
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-fixed border-t border-secondary-200 bg-white px-2 pb-safe md:hidden">
      <div className="flex items-center justify-around">
        {bottomNavItems.map((item) => {
          const isActive = item.path ? pathname === item.path : false;
          const Icon = item.icon;
          
          if (item.action === 'sheet') {
            return (
              <button
                key={item.label}
                onClick={onMenuClick}
                className={cn(
                  'relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-secondary-600 transition-colors active:scale-95'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          }
          
          return (
            <Link
              key={item.path}
              href={item.path!}
              className={cn(
                'relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-secondary-600 transition-colors active:scale-95',
                isActive && 'text-primary-500'
              )}
            >
              {isActive && (
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
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export const BottomNavSpacer: React.FC = () => {
  return <div className="h-14 md:hidden" />;
};