import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  apiListSessions,
  apiGetSession,
  apiCreateSession,
  apiSendMessage,
  apiResolveSession,
} from "@/lib/api/client";
import type { ChatMessageResponse } from "@/lib/api/types";

export function useSessions(deviceId: string) {
  return useQuery({
    queryKey: ["sessions", deviceId],
    queryFn: () => apiListSessions(deviceId),
    enabled: !!deviceId,
  });
}

export function useSession(sessionId: string) {
  return useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => apiGetSession(sessionId),
    enabled: !!sessionId,
  });
}

export function useCreateSession(deviceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (problem: string) => apiCreateSession(deviceId, problem),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions", deviceId] }),
  });
}

export function useResolveSession(deviceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => apiResolveSession(sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions", deviceId] });
    },
  });
}

export function useStreamingChat(sessionId: string) {
  const qc = useQueryClient();
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const abortRef = useRef<(() => void) | null>(null);

  const loadHistory = useCallback(
    async (existingMessages: ChatMessageResponse[]) => {
      setMessages(existingMessages);
    },
    []
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!sessionId || streaming) return;

      const userMsg: ChatMessageResponse = {
        id: crypto.randomUUID(),
        session_id: sessionId,
        role: "user",
        content,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setStreaming(true);
      setStreamingText("");

      let accumulated = "";

      try {
        await apiSendMessage(
          sessionId,
          content,
          (chunk) => {
            accumulated += chunk;
            setStreamingText(accumulated);
          },
          () => {
            const assistantMsg: ChatMessageResponse = {
              id: crypto.randomUUID(),
              session_id: sessionId,
              role: "assistant",
              content: accumulated,
              created_at: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, assistantMsg]);
            setStreamingText("");
            setStreaming(false);
            qc.invalidateQueries({ queryKey: ["session", sessionId] });

            // Speak the response via browser TTS
            if ("speechSynthesis" in window && accumulated) {
              window.speechSynthesis.cancel();
              const utterance = new SpeechSynthesisUtterance(accumulated);
              utterance.rate = 1.0;
              utterance.pitch = 1.0;
              window.speechSynthesis.speak(utterance);
            }
          }
        );
      } catch (err) {
        setStreaming(false);
        setStreamingText("");
        const errMsg: ChatMessageResponse = {
          id: crypto.randomUUID(),
          session_id: sessionId,
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errMsg]);
      }
    },
    [sessionId, streaming, qc]
  );

  const stopSpeaking = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return {
    messages,
    streaming,
    streamingText,
    loadHistory,
    sendMessage,
    stopSpeaking,
  };
}
