'use client';

import { useParams } from 'next/navigation';
import ChatInterface from '@/components/chat/ChatInterface';
import { useTempChatCleanup } from '@/hooks/useTempChatCleanup';

export default function TempChatPage() {
  const params = useParams();
  const tempChatId = params.tempChatId as string;

  // Cleanup temp chat when user leaves
  useTempChatCleanup(tempChatId);

  return (
    <ChatInterface
      chatType="temp"
      chatId={tempChatId}
    />
  );
}
