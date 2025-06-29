'use client';

import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Loader2, User } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AuthFormProps {
  isRegisteringInitially: boolean;
}

export const AuthForm: React.FC<AuthFormProps> = ({ isRegisteringInitially }) => {
  const { signIn, signUp, signInWithGoogle, signInWithPhone, verifyOtp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(isRegisteringInitially);
  const [isLoading, setIsLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [otpSent, setOtpSent] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (isRegistering) {
        await signUp(email, password, name);
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await signInWithPhone(phone);
      setOtpSent(true);
      toast.success('OTP sent to your phone!');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await verifyOtp(phone, otp);
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
      <div className="max-w-md w-full bg-background rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center mb-6">
          {otpSent ? 'Verify OTP' : (isRegistering ? 'Create Account' : 'Sign In')}
        </h2>
        
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
            {error}
          </div>
        )}

        {!otpSent && (
          <div className="mb-4">
            <div className="flex rounded-md shadow-sm">
              <button
                type="button"
                onClick={() => setAuthMethod('email')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-l-md border ${
                  authMethod === 'email'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground border-border hover:bg-secondary'
                }`}
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => setAuthMethod('phone')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
                  authMethod === 'phone'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground border-border hover:bg-secondary'
                }`}
              >
                Phone
              </button>
            </div>
          </div>
        )}

        {otpSent ? (
          <form onSubmit={handleOtpVerify} className="space-y-4">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-foreground mb-1">
                Enter OTP
              </label>
              <Input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                required
                maxLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify OTP'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => {
                setOtpSent(false);
                setOtp('');
                setError('');
              }}
            >
              Back
            </Button>
          </form>
        ) : authMethod === 'email' ? (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {isRegistering && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
                  Name
                </label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (isRegistering ? 'Sign Up' : 'Sign In')}
            </Button>
          </form>
        ) : (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1">
                Phone Number
              </label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1234567890"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send OTP'}
            </Button>
          </form>
        )}

        {!otpSent && (
          <>
            <div className="mt-4">
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                <User className="h-4 w-4 mr-2" />
                Continue with Google
              </Button>
            </div>

            {authMethod === 'email' && (
              <p className="mt-4 text-center text-sm text-secondary-foreground">
                {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button
                  type="button"
                  onClick={() => setIsRegistering(!isRegistering)}
                  className="text-primary hover:underline"
                >
                  {isRegistering ? 'Sign In' : 'Sign Up'}
                </button>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};