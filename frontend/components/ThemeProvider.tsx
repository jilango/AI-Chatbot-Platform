'use client';

import { useEffect, useState } from 'react';
import { useThemeStore } from '@/store/themeStore';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const theme = useThemeStore((state) => state.theme);

  // Initialize theme on mount
  useEffect(() => {
    setMounted(true);
    const root = window.document.documentElement;
    const storedTheme = localStorage.getItem('theme-storage');
    if (storedTheme) {
      try {
        const parsed = JSON.parse(storedTheme);
        const initialTheme = parsed.state?.theme || 'dark';
        root.classList.remove('light', 'dark');
        root.classList.add(initialTheme);
      } catch (e) {
        root.classList.add('dark');
      }
    } else {
      root.classList.add('dark');
    }
  }, []);

  // Update theme when it changes
  useEffect(() => {
    if (mounted) {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
      document.body.style.colorScheme = theme;
    }
  }, [theme, mounted]);

  return <>{children}</>;
}
