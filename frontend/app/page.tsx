'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, checkAuth } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      const ok = await checkAuth();
      setIsChecking(false);
      if (ok) router.push('/dashboard');
      else router.push('/login');
    };
    check();
  }, [checkAuth, router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center animate-in fade-in duration-200">
      <div className="text-center">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
