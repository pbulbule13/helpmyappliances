"use client";

import { useState, useCallback, useRef } from "react";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionInstance = any;

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function VoiceInput({ onTranscript, disabled }: VoiceInputProps) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance>(null);

  const supported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const startListening = useCallback(() => {
    if (!supported || disabled) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechRec = w.SpeechRecognition || w.webkitSpeechRecognition;

    if (!SpeechRec) return;

    const rec = new SpeechRec();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (e: any) => {
      let interimText = "";
      let finalText = "";
      for (const result of e.results) {
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }
      setInterim(interimText);
      if (finalText) {
        onTranscript(finalText.trim());
        setInterim("");
      }
    };

    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);

    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }, [supported, disabled, onTranscript]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
    setInterim("");
  }, []);

  if (!supported) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={listening ? stopListening : startListening}
        disabled={disabled}
        title={listening ? "Stop listening" : "Speak your question"}
        className={cn(
          "p-2.5 rounded-lg transition-all",
          listening
            ? "bg-red-100 text-red-600 animate-pulse"
            : "text-gray-500 hover:bg-gray-100 hover:text-brand-600",
          disabled && "opacity-40 cursor-not-allowed"
        )}
      >
        {listening ? <MicOff size={18} /> : <Mic size={18} />}
      </button>

      {interim && (
        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap max-w-xs truncate shadow-lg">
          {interim}
        </div>
      )}
    </div>
  );
}
