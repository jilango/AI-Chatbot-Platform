'use client';

import { useParams } from 'next/navigation';
import ChatInterface from '@/components/chat/ChatInterface';

export default function AgentChatPage() {
  const params = useParams();
  const agentId = params.agentId as string;

  return (
    <ChatInterface
      chatType="agent"
      chatId={agentId}
    />
  );
}
