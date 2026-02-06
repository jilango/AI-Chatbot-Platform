'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

const VALUE_PROPS = [
  {
    title: 'Multi-Agent Projects',
    description: 'Organize agents into projects with shared context',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    ),
  },
  {
    title: 'Smart Context Sharing',
    description: 'Agents learn from each other automatically',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    ),
  },
  {
    title: 'RAG-Powered Search',
    description: 'Semantic retrieval finds the right context every time',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    ),
  },
  {
    title: 'Beautiful Interface',
    description: 'Modern, intuitive design that gets out of your way',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
    ),
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});

  const toggleCard = (index: number) => {
    setFlippedCards((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      // Error is handled by the store
    }
  };

  return (
    <div className="min-h-screen flex justify-center bg-background">
      <div className="w-full max-w-6xl min-h-screen flex flex-col lg:flex-row gap-12 lg:gap-16">
      {/* Left Panel - Hero + value props */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:py-16 xl:py-20 lg:px-12 xl:px-16 animate-in fade-in duration-500 order-2 lg:order-1">
        <div className="max-w-lg xl:max-w-xl mx-auto lg:mx-0 w-full">
          {/* Logo + Brand - Desktop only */}
          <div className="hidden lg:flex items-center gap-3 mb-10">
            <div className="relative w-12 h-12 rounded-xl btn-gradient glow flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">Chatbot Platform</span>
          </div>

          <h1 className="text-center lg:text-left text-3xl lg:text-4xl font-bold text-white mb-4 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
            Build Teams of Smarter AI Chats in Minutes
          </h1>
          <p className="text-center lg:text-left text-white/90 text-lg mb-10 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
            Create, organize, and deploy AI agents that actually understand your context. No complexity, just results.
          </p>

          <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">
            {VALUE_PROPS.map((item, i) => (
              <div
                key={i}
                className={`flip-container rounded-2xl${flippedCards[i] ? ' flipped' : ''}`}
                style={{ height: '10rem' }}
                onClick={() => toggleCard(i)}
              >
                <div className="flip-card">
                  {/* Front face */}
                  <div className="flip-front bg-card border border-border flex flex-col">
                    <div className="p-4">
                      <h3 className="font-semibold text-white text-sm">{item.title}</h3>
                    </div>
                    <div className="btn-gradient flex-1 flex items-center justify-center">
                      <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {item.icon}
                      </svg>
                    </div>
                  </div>
                  {/* Back face */}
                  <div className="flip-back gradient-border flex flex-col items-center justify-center p-5">
                    <h3 className="font-semibold text-white text-sm mb-2">{item.title}</h3>
                    <p className="text-xs text-white/70 leading-relaxed text-center">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center lg:text-left mt-10 text-sm text-white/70 animate-in fade-in duration-500 delay-500">
            Click the cards to know why builders creating AI teams choose this app.
          </p>
        </div>
      </div>

      {/* Right Panel - Login form */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 lg:py-16 xl:py-20 order-1 lg:order-2">
        <div className="w-full max-w-md">
          {/* Logo + Brand - Mobile only */}
          <div className="flex items-center justify-center gap-3 mb-8 lg:hidden">
            <div className="relative w-12 h-12 rounded-xl btn-gradient glow flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">Chatbot Platform</span>
          </div>
          {/* Login Card */}
          <div className="bg-card rounded-2xl p-8 border border-border shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">Welcome Back</h2>
              <p className="text-muted-foreground">Sign in to continue to your dashboard</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-500 text-sm flex-1">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-gradient w-auto px-25 py-2.5 rounded-full font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto mt-3"
              >
                {isLoading ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground text-sm">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="text-primary hover:text-primary-hover font-medium transition-colors">
                  Sign up for free
                </Link>
              </p>
            </div>
          </div>

          <p className="mt-8 text-center text-muted-foreground text-xs animate-in fade-in duration-300 delay-300">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
