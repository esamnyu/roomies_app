// src/components/LandingPageContent.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FaCheckCircle, FaBroom, FaMoneyBillWave, FaBook, FaComments } from 'react-icons/fa';

interface LandingPageContentProps {
  onSignIn: () => void;
  onSignUp: () => void;
}

export const LandingPageContent: React.FC<LandingPageContentProps> = ({ onSignIn, onSignUp }) => {
  return (
    <div className="min-h-screen bg-neutral-50 text-gray-800"> {/* [cite: 12] */}
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center"> {/* [cite: 12] */}
        <div className="flex items-center">
          <h1 className="text-3xl font-bold text-emerald-800">Roomies</h1> {/* [cite: 12] */}
        </div>
        {/* Simplified nav for MVP - direct login/signup */}
        <div>
          <button onClick={onSignIn} className="mr-4 text-gray-700 hover:text-emerald-600">Login</button> {/* [cite: 13] */}
          <button onClick={onSignUp} className="bg-emerald-700 hover:bg-emerald-800 text-white py-2 px-4 rounded-md">
            Sign Up Free
          </button> {/* [cite: 13] */}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-12 md:py-24 flex flex-col md:flex-row items-center"> {/* [cite: 14] */}
        <div className="md:w-1/2 mb-12 md:mb-0">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
            Roommate Living
            <br />
            Made Easy
          </h2> {/* [cite: 14] */}
          <div className="space-y-4 mb-8"> {/* [cite: 15] */}
            <div className="flex items-center">
              <FaCheckCircle className="text-emerald-500 mr-2" /> {/* [cite: 15] */}
              <p className="text-gray-700">Manage chores, bills, and house rules</p> {/* [cite: 15] */}
            </div>
            <div className="flex items-center">
              <FaCheckCircle className="text-emerald-500 mr-2" /> {/* [cite: 16] */}
              <p className="text-gray-700">Get organized in 5 minutes or less</p> {/* [cite: 16] */}
            </div>
            <div className="flex items-center">
              <FaCheckCircle className="text-emerald-500 mr-2" /> {/* [cite: 16] */}
              <p className="text-gray-700">Free for up to 4 roommates</p> {/* [cite: 16] */}
            </div>
          </div>
          <button
            onClick={onSignUp}
            className="bg-emerald-700 hover:bg-emerald-800 text-white py-3 px-6 rounded-md text-lg font-medium inline-block"
          >
            Create Your House
          </button> {/* [cite: 17] */}
        </div>
        <div className="md:w-1/2">
          <div className="relative h-80 w-full">
            {/* Placeholder for dashboard image - ensure you have an image at this path or update it */}
            <Image
              src="/roommate-dashboard.png" // [cite: 18]
              alt="Roomies dashboard preview" // [cite: 18]
              layout="fill"
              objectFit="contain"
              className="rounded-lg shadow-lg"
              priority
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white"> {/* [cite: 19] */}
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-16">The Roomies Difference</h2> {/* [cite: 19] */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"> {/* [cite: 19] */}
            <div className="flex flex-col items-center text-center"> {/* [cite: 20] */}
              <div className="bg-neutral-100 p-6 rounded-full mb-4"><FaBroom className="text-4xl text-emerald-600" /></div> {/* [cite: 20] */}
              <h3 className="text-xl font-semibold mb-2">Chore Management</h3> {/* [cite: 20] */}
              <p className="text-gray-600">Create and assign chores with automated rotation and reminders for everyone.</p> {/* [cite: 21] */}
            </div>
            <div className="flex flex-col items-center text-center"> {/* [cite: 22] */}
              <div className="bg-neutral-100 p-6 rounded-full mb-4"><FaMoneyBillWave className="text-4xl text-emerald-600" /></div> {/* [cite: 22] */}
              <h3 className="text-xl font-semibold mb-2">Bill Splitting</h3> {/* [cite: 23] */}
              <p className="text-gray-600">Track expenses, split bills, and settle up easily with integrated payment solutions.</p> {/* [cite: 23] */}
            </div>
            <div className="flex flex-col items-center text-center"> {/* [cite: 24] */}
              <div className="bg-neutral-100 p-6 rounded-full mb-4"><FaBook className="text-4xl text-emerald-600" /></div> {/* [cite: 24] */}
              <h3 className="text-xl font-semibold mb-2">House Rules</h3> {/* [cite: 25] */}
              <p className="text-gray-600">Document and share house rules to keep everyone on the same page.</p> {/* [cite: 25] */}
            </div>
            <div className="flex flex-col items-center text-center"> {/* [cite: 26] */}
              <div className="bg-neutral-100 p-6 rounded-full mb-4"><FaComments className="text-4xl text-emerald-600" /></div> {/* [cite: 26] */}
              <h3 className="text-xl font-semibold mb-2">Chat & Todo Lists</h3> {/* [cite: 27] */}
              <p className="text-gray-600">Communicate easily and manage shared to-do lists in one place.</p> {/* [cite: 27] */}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-emerald-700 py-16"> {/* [cite: 28] */}
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Ready to simplify roommate living?</h2> {/* [cite: 28] */}
          <p className="text-white text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of happy roommates who use Roomies to manage their shared living space. {/* [cite: 29] */}
          </p>
          <button
            onClick={onSignUp}
            className="bg-white text-emerald-700 py-3 px-8 rounded-md text-lg font-medium hover:bg-neutral-100"
          >
            Get Started Free
          </button> {/* [cite: 30] */}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-800 text-white py-12"> {/* [cite: 30] */}
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between"> {/* [cite: 31] */}
            <div className="mb-8 md:mb-0">
              <h3 className="text-2xl font-bold mb-4">Roomies</h3> {/* [cite: 31] */}
              <p className="text-neutral-300 max-w-xs">The complete solution for managing your shared living space.</p> {/* [cite: 31] */}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8"> {/* [cite: 32] */}
              <div>
                <h4 className="text-lg font-semibold mb-4">Product</h4> {/* [cite: 32] */}
                <ul className="space-y-2">
                  <li><Link href="/features" className="text-neutral-300 hover:text-white">Features</Link></li> {/* [cite: 32] */}
                  <li><Link href="/pricing" className="text-neutral-300 hover:text-white">Pricing</Link></li> {/* [cite: 33] */}
                  <li><Link href="/faq" className="text-neutral-300 hover:text-white">FAQ</Link></li> {/* [cite: 33] */}
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-4">Company</h4> {/* [cite: 34] */}
                <ul className="space-y-2">
                  <li><Link href="/about" className="text-neutral-300 hover:text-white">About Us</Link></li> {/* [cite: 34] */}
                  <li><Link href="/blog" className="text-neutral-300 hover:text-white">Blog</Link></li> {/* [cite: 34] */}
                  <li><Link href="/contact" className="text-neutral-300 hover:text-white">Contact</Link></li> {/* [cite: 34] */}
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-4">Legal</h4> {/* [cite: 35] */}
                <ul className="space-y-2">
                  <li><Link href="/terms" className="text-neutral-300 hover:text-white">Terms</Link></li> {/* [cite: 35] */}
                  <li><Link href="/privacy" className="text-neutral-300 hover:text-white">Privacy</Link></li> {/* [cite: 36] */}
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-neutral-700 mt-12 pt-8 text-center text-neutral-400"> {/* [cite: 36] */}
            <p>&copy; {new Date().getFullYear()} Roomies. All rights reserved.</p> {/* [cite: 37] */}
          </div>
        </div>
      </footer>
    </div>
  );
};