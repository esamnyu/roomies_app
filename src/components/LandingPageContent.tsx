// src/components/LandingPageContent.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FaCheckCircle, FaBroom, FaMoneyBillWave, FaBook, FaComments } from 'react-icons/fa';
import { Button } from '@/components/ui/Button';

interface LandingPageContentProps {
  onSignIn: () => void;
  onSignUp: () => void;
}

export const LandingPageContent: React.FC<LandingPageContentProps> = ({ onSignIn, onSignUp }) => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <h1 className="text-3xl font-bold text-primary">Roomies</h1>
        </div>
        <div>
          <Button onClick={onSignIn} variant="outline" className="mr-4">
            Login
          </Button>
          <Button onClick={onSignUp}>
            Sign Up Free
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-12 md:py-24 flex flex-col md:flex-row items-center">
        <div className="md:w-1/2 mb-12 md:mb-0">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Roommate Living
            <br />
            Made Easy
          </h2>
          <div className="space-y-4 mb-8">
            <div className="flex items-center">
              <FaCheckCircle className="text-primary mr-2" />
              <p className="text-secondary-foreground">Manage chores, bills, and house rules</p>
            </div>
            <div className="flex items-center">
              <FaCheckCircle className="text-primary mr-2" />
              <p className="text-secondary-foreground">Get organized in 5 minutes or less</p>
            </div>
            <div className="flex items-center">
              <FaCheckCircle className="text-primary mr-2" />
              <p className="text-secondary-foreground">Free for up to 4 roommates</p>
            </div>
          </div>
          <Button onClick={onSignUp} size="lg">
            Create Your House
          </Button>
        </div>
        <div className="md:w-1/2">
          <div className="relative h-80 w-full">
            {/* Placeholder for dashboard image */}
            <Image
              src="/roommate-dashboard.png"
              alt="Roomies dashboard preview"
              layout="fill"
              objectFit="contain"
              className="rounded-lg shadow-lg"
              priority
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-foreground mb-16">The Roomies Difference</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="flex flex-col items-center text-center">
              <div className="bg-secondary p-6 rounded-full mb-4"><FaBroom className="text-4xl text-primary" /></div>
              <h3 className="text-xl font-semibold mb-2">Chore Management</h3>
              <p className="text-secondary-foreground">Create and assign chores with automated rotation and reminders for everyone.</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="bg-secondary p-6 rounded-full mb-4"><FaMoneyBillWave className="text-4xl text-primary" /></div>
              <h3 className="text-xl font-semibold mb-2">Bill Splitting</h3>
              <p className="text-secondary-foreground">Track expenses, split bills, and settle up easily with integrated payment solutions.</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="bg-secondary p-6 rounded-full mb-4"><FaBook className="text-4xl text-primary" /></div>
              <h3 className="text-xl font-semibold mb-2">House Rules</h3>
              <p className="text-secondary-foreground">Document and share house rules to keep everyone on the same page.</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="bg-secondary p-6 rounded-full mb-4"><FaComments className="text-4xl text-primary" /></div>
              <h3 className="text-xl font-semibold mb-2">Chat & Todo Lists</h3>
              <p className="text-secondary-foreground">Communicate easily and manage shared to-do lists in one place.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-primary-foreground mb-6">Ready to simplify roommate living?</h2>
          <p className="text-primary-foreground text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of happy roommates who use Roomies to manage their shared living space.
          </p>
          <Button
            onClick={onSignUp}
            variant="secondary"
            size="lg"
            className="bg-white text-primary hover:bg-secondary"
          >
            Get Started Free
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary-foreground text-secondary py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between">
            <div className="mb-8 md:mb-0">
              <h3 className="text-2xl font-bold mb-4">Roomies</h3>
              <p className="text-secondary max-w-xs opacity-80">The complete solution for managing your shared living space.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              <div>
                <h4 className="text-lg font-semibold mb-4">Product</h4>
                <ul className="space-y-2">
                  <li><Link href="/features" className="text-secondary opacity-80 hover:opacity-100">Features</Link></li>
                  <li><Link href="/pricing" className="text-secondary opacity-80 hover:opacity-100">Pricing</Link></li>
                  <li><Link href="/faq" className="text-secondary opacity-80 hover:opacity-100">FAQ</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-4">Company</h4>
                <ul className="space-y-2">
                  <li><Link href="/about" className="text-secondary opacity-80 hover:opacity-100">About Us</Link></li>
                  <li><Link href="/blog" className="text-secondary opacity-80 hover:opacity-100">Blog</Link></li>
                  <li><Link href="/contact" className="text-secondary opacity-80 hover:opacity-100">Contact</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-4">Legal</h4>
                <ul className="space-y-2">
                  <li><Link href="/terms" className="text-secondary opacity-80 hover:opacity-100">Terms</Link></li>
                  <li><Link href="/privacy" className="text-secondary opacity-80 hover:opacity-100">Privacy</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-secondary mt-12 pt-8 text-center text-secondary opacity-60">
            <p>&copy; {new Date().getFullYear()} Roomies. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};