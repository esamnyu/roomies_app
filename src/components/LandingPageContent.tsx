'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

// Define the interface for mouse position at the top level
interface MousePosition {
  x: number;
  y: number;
}

export const LandingPageContent: React.FC<{ onSignIn: () => void; onSignUp: () => void; }> = ({ onSignIn, onSignUp }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mousePos, setMousePos] = useState<MousePosition>({ x: 0, y: 0 });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    const handleMouseMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Data arrays for features and testimonials...
  const features = [
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256">
          <path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM224,48V208a16,16,0,0,1-16,16H48a16,16,0,0,1-16-16V48A16,16,0,0,1,48,32H208A16,16,0,0,1,224,48ZM208,208V48H48V208H208Z" />
        </svg>
      ),
      title: "Automated Chores",
      description: "Never argue about chores again. Our AI-powered system assigns tasks fairly and sends smart reminders.",
      gradient: "from-emerald-400 to-cyan-400"
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256">
          <path d="M152,120H136V56h8a32,32,0,0,1,32,32,8,8,0,0,0,16,0,48.05,48.05,0,0,0-48-48h-8V24a8,8,0,0,0-16,0V40h-8a48,48,0,0,0,0,96h8v64H104a32,32,0,0,1-32-32,8,8,0,0,0-16,0,48.05,48.05,0,0,0,48,48h16v16a8,8,0,0,0,16,0V216h16a48,48,0,0,0,0-96Zm-40,0a32,32,0,0,1,0-64h8v64Zm40,80H136V136h16a32,32,0,0,1,0,64Z" />
        </svg>
      ),
      title: "Smart Bill Splitting",
      description: "Split bills instantly with OCR scanning. Track expenses, send reminders, and settle up with one tap.",
      gradient: "from-purple-400 to-pink-400"
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256">
          <path d="M140,128a12,12,0,1,1-12-12A12,12,0,0,1,140,128ZM84,116a12,12,0,1,0,12,12A12,12,0,0,0,84,116Zm88,0a12,12,0,1,0,12,12A12,12,0,0,0,172,116Zm60,12A104,104,0,0,1,79.12,219.82L45.07,231.17a16,16,0,0,1-20.24-20.24l11.35-34.05A104,104,0,1,1,232,128Zm-16,0A88,88,0,1,0,51.81,172.06a8,8,0,0,1,.66,6.54L40,216,77.4,203.53a7.85,7.85,0,0,1,2.53-.42,8,8,0,0,1,4,1.08A88,88,0,0,0,216,128Z" />
        </svg>
      ),
      title: "Real-time Chat",
      description: "Keep all communication in one place with our built-in chat, announcements, and shared calendar.",
      gradient: "from-orange-400 to-red-400"
    }
  ];
  
  const testimonials = [
      {
        image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1888&auto=format&fit=crop",
        quote: "Roomies transformed our chaotic apartment into a harmonious home. The automated chore system is genius!",
        name: "Sophia Chen",
        role: "Graduate Student"
      },
      {
        image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1887&auto=format&fit=crop",
        quote: "Bill splitting used to be a nightmare. Now it takes seconds and everyone's happy. This app is a lifesaver!",
        name: "Marcus Johnson",
        role: "Software Engineer"
      },
      {
        image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1887&auto=format&fit=crop",
        quote: "The best investment for shared living. Our communication improved 10x and conflicts disappeared overnight.",
        name: "Emma Rodriguez",
        role: "Marketing Manager"
      }
    ];

  return (
    <div className="relative flex size-full min-h-screen flex-col bg-[#0a0a0a] text-white group/design-root overflow-x-hidden font-sans">
      {/* --- START of CHANGE --- */}
      <div className="fixed inset-0 -z-10">
        {/* Animated Shimmer Layer */}
        <div className="absolute inset-0 animate-shimmer bg-[linear-gradient(110deg,#0a0a0a,45%,#1e293b,55%,#0a0a0a)] bg-[length:200%_100%] opacity-25" />
        
        {/* Your existing layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 via-transparent to-purple-900/20" />
        <div 
          className="absolute inset-0 opacity-40 transition-opacity"
          style={{
            background: `radial-gradient(circle at ${mousePos.x}px ${mousePos.y}px, rgba(30, 224, 192, 0.15) 0%, transparent 40%)`,
          }}
        />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width=%2260%22%20height=%2260%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cdefs%3E%3Cpattern%20id=%22grid%22%20width=%2260%22%20height=%2260%22%20patternUnits=%22userSpaceOnUse%22%3E%3Cpath%20d=%22M%2060%200%20L%200%200%200%2060%22%20fill=%22none%22%20stroke=%22rgba(255,255,255,0.03)%22%20stroke-width=%221%22/%3E%3C/pattern%3E%3C/defs%3E%3Crect%20width=%22100%25%22%20height=%22100%25%22%20fill=%22url(%23grid)%22/%3E%3C/svg%3E')]" />
      </div>
      {/* --- END of CHANGE --- */}

      <div className="layout-container flex h-full grow flex-col">
        {/* Header and Main content... */}
        <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-black/80 backdrop-blur-xl shadow-2xl' : 'bg-transparent'}`}>
          <div className="flex items-center justify-between whitespace-nowrap px-10 py-4">
            <div className="flex items-center gap-4 group cursor-pointer">
              <div className="size-4 text-[#1ee0c0] transform transition-transform group-hover:rotate-180 duration-500">
                <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M24 4H42V17.3333V30.6667H24V44H6V30.6667V17.3333H24V4Z" fill="currentColor"></path>
                </svg>
              </div>
              <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] group-hover:text-[#1ee0c0] transition-colors">Roomies</h2>
            </div>
            <div className="flex flex-1 justify-end items-center gap-4">
              <nav className="hidden md:flex items-center gap-9">
                <a className="text-gray-300 text-sm font-medium leading-normal hover:text-[#1ee0c0] transition-colors relative group" href="#">
                  Features
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#1ee0c0] transition-all group-hover:w-full"></span>
                </a>
                <a className="text-gray-300 text-sm font-medium leading-normal hover:text-[#1ee0c0] transition-colors relative group" href="#">
                  Pricing
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#1ee0c0] transition-all group-hover:w-full"></span>
                </a>
                <a className="text-gray-300 text-sm font-medium leading-normal hover:text-[#1ee0c0] transition-colors relative group" href="#">
                  Support
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#1ee0c0] transition-all group-hover:w-full"></span>
                </a>
              </nav>
              <Button 
                onClick={onSignIn} 
                variant="outline" 
                className="border-gray-600 text-gray-200 hover:border-[#1ee0c0] hover:text-[#1ee0c0] hover:bg-white/5 transition-all duration-300"
              >
                Login
              </Button>
              <Button 
                onClick={onSignUp} 
                className="bg-gradient-to-r from-[#1ee0c0] to-[#0fa89d] text-black font-semibold hover:shadow-[0_0_20px_rgba(30,224,192,0.5)] transform hover:scale-105 transition-all duration-300"
              >
                <span className="truncate">Sign Up Free</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="px-4 sm:px-10 md:px-20 lg:px-40 flex flex-1 justify-center pt-20">
          <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
            
            <section className="container mx-auto">
              <div className="flex flex-col gap-8 py-10 lg:flex-row items-center min-h-[80vh]">
                <div className="flex flex-col gap-6 lg:w-1/2 text-center lg:text-left animate-fade-in-up">
                  <h1 className="text-5xl md:text-6xl font-black leading-tight tracking-[-0.033em] bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent animate-gradient">
                    Simplify Shared Living, Maximize Harmony
                  </h1>
                  <h2 className="text-gray-400 text-lg leading-relaxed">
                    Roomies is your all-in-one solution for managing shared living spaces. From automated chores to effortless bill splitting and centralized communication, we make cohabitation a breeze.
                  </h2>
                  <div className="flex gap-4 mt-4 justify-center lg:justify-start">
                    <Button
                      onClick={onSignUp}
                      className="h-12 px-8 bg-gradient-to-r from-[#1ee0c0] to-[#0fa89d] text-black text-base font-bold hover:shadow-[0_0_30px_rgba(30,224,192,0.6)] transform hover:scale-105 transition-all duration-300"
                    >
                      <span className="truncate">Get Started Free</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-12 px-8 border-gray-600 text-gray-200 hover:border-[#1ee0c0] hover:bg-white/5 hover:text-[#1ee0c0] transition-all duration-300"
                    >
                      Watch Demo
                    </Button>
                  </div>
                </div>
                <div className="relative w-full lg:w-1/2 animate-fade-in-up animation-delay-200">
                  <div className="absolute -inset-8 bg-gradient-to-r from-[#1ee0c0]/20 to-purple-600/20 blur-3xl" />
                  <div
                    className="relative w-full bg-center bg-no-repeat aspect-video bg-cover rounded-2xl overflow-hidden transform hover:scale-[1.02] transition-transform duration-500 shadow-2xl"
                    style={{backgroundImage: 'url("https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?q=80&w=2070&auto=format&fit=crop")'}}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  </div>
                </div>
              </div>
            </section>

            <section className="flex flex-col gap-10 px-4 py-20 container mx-auto">
              <div className="flex flex-col gap-4 text-center animate-fade-in-up">
                <h1 className="text-4xl lg:text-5xl font-black leading-tight tracking-[-0.033em] bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                  Powerful Features
                </h1>
                <p className="text-gray-400 text-lg font-normal leading-normal max-w-[720px] mx-auto">
                  Everything you need to create the perfect shared living experience
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {features.map((feature, index) => (
                  <div 
                    key={index}
                    className="group relative flex flex-col gap-4 rounded-2xl bg-gradient-to-b from-gray-900/50 to-gray-900/30 backdrop-blur-sm border border-gray-800 p-8 hover:border-gray-700 transition-all duration-500 hover:transform hover:scale-[1.02] animate-fade-in-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                    <div className={`text-white bg-gradient-to-r ${feature.gradient} p-3 rounded-xl w-fit group-hover:scale-110 transition-transform duration-300`}>
                      {feature.icon}
                    </div>
                    <div className="flex flex-col gap-2">
                      <h2 className="text-white text-xl font-bold leading-tight">{feature.title}</h2>
                      <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="py-20">
              <h2 className="text-3xl font-bold text-center mb-12 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Loved by Thousands of Happy Roommates
              </h2>
              <div className="flex overflow-x-auto gap-6 pb-6 snap-x snap-mandatory no-scrollbar">
                {testimonials.map((testimonial, index) => (
                  <div 
                    key={index}
                    className="flex-shrink-0 w-80 snap-center"
                  >
                    <div className="relative group cursor-pointer">
                      <div className="absolute -inset-1 bg-gradient-to-r from-[#1ee0c0] to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000"></div>
                      <div className="relative flex flex-col gap-4 rounded-2xl bg-gray-900/90 backdrop-blur-sm border border-gray-800 p-6 h-full">
                        <div className="flex items-center gap-4">
                          <div
                            className="w-16 h-16 bg-center bg-cover rounded-full ring-2 ring-[#1ee0c0]/50"
                            style={{backgroundImage: `url("${testimonial.image}")`}}
                          />
                          <div>
                            <p className="text-white font-semibold">{testimonial.name}</p>
                            <p className="text-gray-400 text-sm">{testimonial.role}</p>
                          </div>
                        </div>
                        <p className="text-gray-300 leading-relaxed italic">"{testimonial.quote}"</p>
                        <div className="flex gap-1 mt-auto">
                          {[...Array(5)].map((_, i) => (
                            <svg key={i} className="w-5 h-5 text-[#1ee0c0]" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="relative py-20 px-4">
              <div className="absolute inset-0 bg-gradient-to-r from-[#1ee0c0]/10 to-purple-600/10 blur-3xl" />
              <div className="relative text-center space-y-6">
                <h2 className="text-4xl font-black bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Ready to Transform Your Living Space?
                </h2>
                <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                  Join thousands of happy roommates who've discovered the secret to harmonious shared living.
                </p>
                <Button
                  onClick={onSignUp}
                  className="h-14 px-10 bg-gradient-to-r from-[#1ee0c0] to-[#0fa89d] text-black text-lg font-bold hover:shadow-[0_0_40px_rgba(30,224,192,0.7)] transform hover:scale-105 transition-all duration-300"
                >
                  Start Your Free Trial
                </Button>
              </div>
            </section>
          </div>
        </main>
      </div>

      <style jsx>{`
        /* --- START of CHANGE --- */
        @keyframes shimmer {
          from {
            background-position: 200% 0;
          }
          to {
            background-position: -200% 0;
          }
        }
        .animate-shimmer {
          animation: shimmer 10s linear infinite;
        }
        /* --- END of CHANGE --- */

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes gradient {
          0%, 100% {
            background-size: 200% 200%;
            background-position: left center;
          }
          50% {
            background-size: 200% 200%;
            background-position: right center;
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
          opacity: 0;
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        .animation-delay-200 {
          animation-delay: 200ms;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};