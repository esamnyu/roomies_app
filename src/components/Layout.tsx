'use client';

import { ArrowLeft } from 'lucide-react';
import { Button } from './ui/Button';

interface LayoutProps {
  title: string;
  children: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  onShowProfile?: () => void;
  isHouseholdView?: boolean;
}

export function Layout({
  title,
  children,
  showBack,
  onBack,
  onShowProfile,
}: LayoutProps) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl p-4 sm:p-6 lg:p-8">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
        </div>
        {onShowProfile && (
          <Button variant="outline" onClick={onShowProfile}>
            Profile
          </Button>
        )}
      </header>
      <main>{children}</main>
    </div>
  );
}