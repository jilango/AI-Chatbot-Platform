const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface SSEOptions {
  projectId: string;
  message: string;
  onChunk: (text: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export function createSSEConnection({
  projectId,
  message,
  onChunk,
  onComplete,
  onError,
}: SSEOptions): () => void {
  const encodedMessage = encodeURIComponent(message);
  const url = `${API_URL}/api/v1/chat/${projectId}/stream?message=${encodedMessage}`;
  const controller = new AbortController();

  const connect = async () => {
    try {
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'text/event-stream' },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          onComplete();
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.error) {
                onError(new Error(data.error));
                return;
              }
              
              if (data.content) {
                onChunk(data.content);
              }
              
              if (data.done) {
                onComplete();
                return;
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        onError(error);
      }
    }
  };

  connect();

  // Return cleanup function
  return () => {
    controller.abort();
  };
}
