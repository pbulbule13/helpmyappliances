"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { Spinner } from "@/components/ui/spinner";

export default function RootPage() {
  const { firebaseUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(firebaseUser ? "/dashboard" : "/login");
  }, [firebaseUser, loading, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner className="w-8 h-8" />
    </div>
  );
}
