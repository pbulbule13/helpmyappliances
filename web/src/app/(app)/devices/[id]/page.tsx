"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, MessageSquare, ExternalLink, Plus, Clock, CheckCircle } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ChatInterface } from "@/components/chat/chat-interface";
import { useDevice } from "@/hooks/use-devices";
import { useSessions, useCreateSession, useResolveSession } from "@/hooks/use-chat";
import { useQuery } from "@tanstack/react-query";
import { apiListDocuments } from "@/lib/api/client";
import { categoryIcon, categoryLabel, docTypeLabel, formatDate } from "@/lib/utils";
import type { SessionResponse } from "@/lib/api/types";

type Tab = "documents" | "chat";

export default function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("chat");
  const [activeSession, setActiveSession] = useState<SessionResponse | null>(null);
  const [problem, setProblem] = useState("");
  const [starting, setStarting] = useState(false);

  const { data: device, isLoading: loadingDevice } = useDevice(id);
  const { data: sessionsData, isLoading: loadingSessions } = useSessions(id);
  const { data: docsData, isLoading: loadingDocs } = useQuery({
    queryKey: ["documents", id],
    queryFn: () => apiListDocuments(id),
    enabled: !!id,
  });

  const createSession = useCreateSession(id);
  const resolveSession = useResolveSession(id);

  const sessions = sessionsData?.sessions ?? [];
  const docs = docsData?.documents ?? [];

  const handleNewChat = async () => {
    setStarting(true);
    try {
      const session = await createSession.mutateAsync(
        problem.trim() || "General troubleshooting"
      );
      setActiveSession(session);
      setProblem("");
      setTab("chat");
    } catch {
      toast.error("Failed to start session");
    } finally {
      setStarting(false);
    }
  };

  const handleResolve = async () => {
    if (!activeSession) return;
    try {
      await resolveSession.mutateAsync(activeSession.id);
      toast.success("Session marked as resolved");
      setActiveSession({ ...activeSession, status: "resolved" });
    } catch {
      toast.error("Failed to resolve session");
    }
  };

  const handleOpenSession = (session: SessionResponse) => {
    setActiveSession(session);
    setTab("chat");
  };

  if (loadingDevice) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  if (!device) {
    return (
      <div className="p-8 text-center text-gray-500">
        Appliance not found.{" "}
        <Link href="/dashboard" className="text-brand-600 hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const name = device.nickname || `${device.brand} ${device.model_number}`.trim();

  return (
    <div className="flex flex-col h-screen">
      {/* Device header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft size={18} className="text-gray-500" />
            </Link>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{categoryIcon(device.category)}</span>
              <div>
                <h1 className="text-lg font-bold text-gray-900">{name}</h1>
                <p className="text-sm text-gray-500">
                  {categoryLabel(device.category)} · {device.brand} · Model: <span className="font-mono">{device.model_number}</span>
                  {device.room && ` · ${device.room}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — sessions + new chat */}
        <div className="w-72 shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
          {/* New chat */}
          <div className="p-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">New Session</p>
            <textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="Describe the issue (optional)"
              rows={2}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <Button
              onClick={handleNewChat}
              loading={starting}
              size="sm"
              className="w-full mt-2"
            >
              <Plus size={14} />
              Start chat session
            </Button>
          </div>

          {/* Session history */}
          <div className="flex-1 overflow-y-auto p-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
              History ({sessions.length})
            </p>
            {loadingSessions ? (
              <Spinner className="mx-auto mt-4" />
            ) : sessions.length === 0 ? (
              <p className="text-xs text-gray-400 px-1">No sessions yet</p>
            ) : (
              <div className="space-y-1">
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleOpenSession(s)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors text-sm ${
                      activeSession?.id === s.id
                        ? "bg-brand-50 text-brand-700 border border-brand-200"
                        : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {s.status === "resolved" ? (
                        <CheckCircle size={12} className="text-green-500 shrink-0" />
                      ) : (
                        <Clock size={12} className="text-brand-500 shrink-0" />
                      )}
                      <span className="truncate text-xs font-medium">
                        {s.problem_summary || "General troubleshooting"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 pl-4">
                      {formatDate(s.created_at)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Documents tab toggle */}
          <div className="p-3 border-t border-gray-100">
            <button
              onClick={() => setTab(tab === "documents" ? "chat" : "documents")}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <FileText size={14} />
              {docs.length} document{docs.length !== 1 ? "s" : ""} fetched
              {tab !== "documents" && <ExternalLink size={12} className="ml-auto" />}
            </button>
          </div>
        </div>

        {/* Right panel — chat or documents */}
        <div className="flex-1 overflow-hidden">
          {tab === "documents" ? (
            <div className="h-full overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-800">
                  Documents &amp; Manuals
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setTab("chat")}>
                  ← Back to chat
                </Button>
              </div>

              {loadingDocs ? (
                <Spinner className="mx-auto mt-8" />
              ) : docs.length === 0 ? (
                <div className="text-center text-gray-400 mt-16">
                  <FileText size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No documents found yet</p>
                  <p className="text-xs mt-1">Start a chat to trigger document retrieval</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {docs.map((doc) => (
                    <a
                      key={doc.id}
                      href={doc.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-brand-300 hover:shadow-sm transition-all group"
                    >
                      <div className="p-2 bg-brand-50 rounded-lg shrink-0">
                        <FileText size={16} className="text-brand-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-sm truncate group-hover:text-brand-700">
                          {doc.title}
                        </p>
                        <p className="text-xs text-brand-600 mt-0.5 font-medium">
                          {docTypeLabel(doc.doc_type)}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{doc.source_url}</p>
                      </div>
                      <ExternalLink size={14} className="text-gray-400 shrink-0 group-hover:text-brand-500" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ) : activeSession ? (
            <div className="h-full">
              <ChatInterface
                session={activeSession}
                onResolve={handleResolve}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 p-8">
              <MessageSquare size={48} className="mb-4 opacity-20" />
              <h3 className="text-lg font-semibold text-gray-600">Start a chat session</h3>
              <p className="text-sm mt-1 max-w-sm">
                Ask anything about your {name} — error codes, maintenance, how-to, parts. AI uses the fetched manuals to answer accurately.
              </p>
              <Button className="mt-6" onClick={handleNewChat} loading={starting}>
                <MessageSquare size={14} />
                Start new session
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
