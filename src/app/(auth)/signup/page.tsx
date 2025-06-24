'use client';

import { AuthForm } from '@/components/AuthForm';
import { useRouter } from 'next/navigation';

export default function SignUpPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <h1 className="mb-6 text-center text-3xl font-bold text-foreground">
          Join Roomies Today
        </h1>
        <AuthForm
          isRegisteringInitially={true}
          onSuccess={() => {
            // After successful sign-up, the form automatically switches to the
            // sign-in view. If the user then signs in, we redirect to dashboard.
            router.push('/dashboard');
            router.refresh(); // Refresh to ensure server-side data is up-to-date
          }}
        />
      </div>
    </div>
  );
}