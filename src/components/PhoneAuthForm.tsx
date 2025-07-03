'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/surfaces/Card';

export const PhoneAuthForm = () => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const { signInWithPhone, verifyOtp } = useAuth();

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // International format is recommended for phone numbers (e.g., +14155552671)
    const { error } = await signInWithPhone(phone);

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setOtpSent(true);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await verifyOtp(phone, otp);

    setLoading(false);
    if (error) {
      setError(error.message);
    }
    // On success, the onAuthStateChange listener in AuthProvider will handle the session
    // and the user will be effectively logged in. No redirect is needed here.
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{otpSent ? 'Enter Verification Code' : 'Sign In With Phone'}</CardTitle>
        <CardDescription>
          {otpSent ? `We sent a code to ${phone}.` : 'Please enter your phone number to receive a verification code.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!otpSent ? (
          <form onSubmit={handlePhoneSubmit}>
            <div className="grid gap-2">
              <label htmlFor="phone">Phone Number</label>
              <Input
                id="phone"
                type="tel"
                placeholder="e.g., +14155552671"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full mt-4">
              {loading ? 'Sending...' : 'Send Code'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit}>
            <div className="grid gap-2">
              <label htmlFor="otp">Verification Code</label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full mt-4">
              {loading ? 'Verifying...' : 'Verify Code'}
            </Button>
          </form>
        )}
        {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
      </CardContent>
    </Card>
  );
};