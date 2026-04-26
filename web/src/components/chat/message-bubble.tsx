import { cn, formatDate } from "@/lib/utils";
import type { ChatMessageResponse } from "@/lib/api/types";

interface MessageBubbleProps {
  message: ChatMessageResponse;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold",
          isUser ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600"
        )}
      >
        {isUser ? "You" : "🔧"}
      </div>

      {/* Bubble */}
      <div className={cn("max-w-[75%] space-y-1", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
            isUser
              ? "bg-brand-600 text-white rounded-tr-sm"
              : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm"
          )}
        >
          {message.content}
        </div>
        <p className="text-xs text-gray-400 px-1">
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

export function StreamingBubble({ text }: { text: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm bg-gray-100 text-gray-600">
        🔧
      </div>
      <div className="max-w-[75%]">
        <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white border border-gray-200 text-gray-800 text-sm leading-relaxed shadow-sm">
          {text || (
            <span className="inline-flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
