'use client';

import { AuthForm } from '@/components/AuthForm';
import { useRouter } from 'next/navigation';


export default function SignInPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <h1 className="mb-6 text-center text-3xl font-bold text-foreground">
          Welcome Back to Roomies!
        </h1>
        <AuthForm
          isRegisteringInitially={false}
          onSuccess={() => {
            // On successful sign-in, redirect to the dashboard.
            router.push('/dashboard');
            router.refresh(); // Refresh to ensure server-side data is up-to-date
          }}
        />
      </div>
    </div>
  );
}