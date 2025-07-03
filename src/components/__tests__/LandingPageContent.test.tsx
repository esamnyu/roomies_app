import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LandingPageContent } from '../LandingPageContent';

describe('LandingPageContent', () => {
  it('renders the main headline', () => {
    // Mock the onSignIn and onSignUp props
    const mockOnSignIn = jest.fn();
    const mockOnSignUp = jest.fn();

    render(<LandingPageContent onSignIn={mockOnSignIn} onSignUp={mockOnSignUp} />);

    const headline = screen.getByText(/Simplify Shared Living, Maximize Harmony/i);
    
    expect(headline).toBeInTheDocument();
  });

  it('renders the "Get Started Free" button', () => {
    const mockOnSignIn = jest.fn();
    const mockOnSignUp = jest.fn();

    render(<LandingPageContent onSignIn={mockOnSignIn} onSignUp={mockOnSignUp} />);
    
    const signUpButton = screen.getByRole('button', { name: /Get Started Free/i });

    expect(signUpButton).toBeInTheDocument();
  });
});