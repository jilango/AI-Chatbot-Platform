'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, checkAuth } = useAuthStore();
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await checkAuth();
      if (!cancelled) {
        setHasChecked(true);
        if (!ok) router.push('/login');
      }
    })();
    return () => { cancelled = true; };
  }, [checkAuth, router]);

  useEffect(() => {
    if (hasChecked && !isAuthenticated) router.push('/login');
  }, [hasChecked, isAuthenticated, router]);

  if (!hasChecked || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center animate-in fade-in duration-200">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
