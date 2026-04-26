"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Volume2, VolumeX, CheckCircle } from "lucide-react";
import { MessageBubble, StreamingBubble } from "./message-bubble";
import { VoiceInput } from "./voice-input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useStreamingChat } from "@/hooks/use-chat";
import { useSession } from "@/hooks/use-chat";
import type { SessionResponse } from "@/lib/api/types";

interface ChatInterfaceProps {
  session: SessionResponse;
  onResolve?: () => void;
}

export function ChatInterface({ session, onResolve }: ChatInterfaceProps) {
  const { data: history, isLoading } = useSession(session.id);
  const { messages, streaming, streamingText, loadHistory, sendMessage, stopSpeaking } =
    useStreamingChat(session.id);
  const [input, setInput] = useState("");
  const [muted, setMuted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historyLoaded = useRef(false);

  // Load history once
  useEffect(() => {
    if (history && !historyLoaded.current) {
      historyLoaded.current = true;
      loadHistory(history.messages);
    }
  }, [history, loadHistory]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // Stop TTS when muted toggled on
  useEffect(() => {
    if (muted) stopSpeaking();
  }, [muted, stopSpeaking]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    if (muted && "speechSynthesis" in window) window.speechSynthesis.cancel();
    sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceTranscript = (text: string) => {
    setInput((prev) => (prev ? `${prev} ${text}` : text));
    textareaRef.current?.focus();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  const resolved = session.status === "resolved";

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200">
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Active session</p>
          <p className="text-sm font-semibold text-gray-800 truncate max-w-xs">
            {session.problem_summary || "General troubleshooting"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMuted((m) => !m)}
            title={muted ? "Unmute AI voice" : "Mute AI voice"}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          {!resolved && onResolve && (
            <Button size="sm" variant="secondary" onClick={onResolve}>
              <CheckCircle size={14} />
              Resolve
            </Button>
          )}
          {resolved && (
            <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              Resolved
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && !streaming && (
          <div className="flex flex-col items-center justify-center h-40 text-center text-gray-400">
            <p className="text-3xl mb-2">💬</p>
            <p className="text-sm">Ask anything about this appliance</p>
            <p className="text-xs mt-1">Use text or tap the mic to speak</p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {streaming && <StreamingBubble text={streamingText} />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!resolved && (
        <div className="px-4 py-3 bg-white border-t border-gray-200">
          <div className="flex items-end gap-2 bg-gray-50 rounded-xl border border-gray-200 px-3 py-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about error codes, maintenance, parts… (Enter to send)"
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none max-h-32 py-1"
              style={{ minHeight: "36px" }}
            />
            <div className="flex items-center gap-1 pb-1">
              <VoiceInput onTranscript={handleVoiceTranscript} disabled={streaming} />
              <button
                onClick={handleSend}
                disabled={!input.trim() || streaming}
                className="p-2.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {streaming ? <Spinner className="w-4 h-4 text-white" /> : <Send size={16} />}
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1.5 px-1">
            Powered by EURI AI • Answers based on fetched manuals &amp; documentation
          </p>
        </div>
      )}
    </div>
  );
}
