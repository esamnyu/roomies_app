'use client';

import { useState, FormEvent } from 'react';
import * as api from '@/lib/api';
import toast from 'react-hot-toast';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Loader2 } from 'lucide-react';

interface AuthFormProps {
  isRegisteringInitially: boolean;
  onSuccess?: () => void;
}

export function AuthForm({ isRegisteringInitially, onSuccess }: AuthFormProps) {
  const [isRegistering, setIsRegistering] = useState(isRegisteringInitially);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      if (isRegistering) {
        await api.signUp(email, password, name);
        toast.success('Registration successful! Please sign in.');
        setIsRegistering(false); // Switch to sign-in form after successful registration
      } else {
        await api.signIn(email, password);
        toast.success('Signed in successfully!');
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isRegistering && (
        <Input
          type="text"
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      )}
      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={6}
      />
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          isRegistering ? 'Sign Up' : 'Sign In'
        )}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button
          type="button"
          onClick={() => setIsRegistering(!isRegistering)}
          className="font-semibold text-primary hover:underline"
        >
          {isRegistering ? 'Sign In' : 'Sign Up'}
        </button>
      </p>
    </form>
  );
}