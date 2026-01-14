import { useEffect, useRef } from 'react';
import { useTempChatStore } from '@/store/tempChatStore';

/**
 * Hook to cleanup temporary chat when the user leaves the page
 * @param tempChatId - The ID of the temporary chat to cleanup
 */
export function useTempChatCleanup(tempChatId: string | null) {
  const { deleteTempChat } = useTempChatStore();
  const cleanupCalled = useRef(false);

  useEffect(() => {
    if (!tempChatId) return;

    // Cleanup function that runs when component unmounts
    return () => {
      if (cleanupCalled.current) return;
      cleanupCalled.current = true;
      
      // Attempt to delete the temp chat
      deleteTempChat(tempChatId).catch((error) => {
        console.error('Failed to cleanup temporary chat:', error);
      });
    };
  }, [tempChatId, deleteTempChat]);

  // Also handle page close/refresh
  useEffect(() => {
    if (!tempChatId) return;

    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable cleanup on page close
      const token = localStorage.getItem('token');
      if (token) {
        const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/temporary-chats/${tempChatId}`;
        
        // sendBeacon is more reliable for cleanup on page close
        // It doesn't guarantee delivery but has the best chance
        navigator.sendBeacon(url, JSON.stringify({
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [tempChatId]);
}
