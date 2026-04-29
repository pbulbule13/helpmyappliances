"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { DEV_MODE, devSetEmail } from "@/lib/dev-auth";
import { apiVerifyToken } from "@/lib/api/client";

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: "Weak", color: "bg-red-500" };
  if (score <= 3) return { score, label: "Fair", color: "bg-yellow-500" };
  return { score, label: "Strong", color: "bg-green-500" };
}

export default function LoginPage() {
  return DEV_MODE ? <DevLoginPage /> : <FirebaseLoginPage />;
}

// ─── Dev mode login (no Firebase) ────────────────────────────────────────────

function DevLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      toast.error("Enter a valid email");
      return;
    }
    setLoading(true);
    devSetEmail(email.trim());
    try {
      await apiVerifyToken();
      router.replace("/dashboard");
    } catch {
      toast.error("Could not connect to backend. Is it running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-xl px-8 py-10">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🔧</div>
            <h1 className="text-2xl font-bold text-gray-900">HelpMyAppliances</h1>
            <p className="text-gray-500 text-sm mt-1">Dev mode — no Firebase needed</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your email
              </label>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                This is your unique ID — all your data is private to this email.
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Connecting…" : "Enter →"}
            </button>
          </form>

          <div className="mt-5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs text-amber-700">
              <strong>Dev mode active</strong> — data is isolated per email. Switch to Firebase auth for production.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Firebase login (production) ─────────────────────────────────────────────

type Mode = "login" | "register" | "reset";

function FirebaseLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Handle result when Google redirects back to the app
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const { getGoogleRedirectResult } = await import("@/lib/firebase");
        const result = await getGoogleRedirectResult();
        if (result?.user) {
          router.replace("/dashboard");
        }
      } catch (err: unknown) {
        const code = (err as { code?: string }).code ?? "";
        if (code) {
          toast.error("Google sign-in failed. Please try again.");
        }
      }
    };
    handleRedirectResult();
  }, [router]);

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const { signInWithGoogle } = await import("@/lib/firebase");
      await signInWithGoogle();
      // signInWithRedirect navigates away — this line is never reached on success
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      if (code !== "auth/cancelled-popup-request") {
        toast.error("Google sign-in failed. Please try again.");
      }
      setLoading(false);
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { signInWithEmail } = await import("@/lib/firebase");
        await signInWithEmail(email, password);
      } else {
        const { registerWithEmail } = await import("@/lib/firebase");
        await registerWithEmail(email, password);
        toast.success("Account created!");
      }
      router.replace("/dashboard");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      if (code === "auth/user-not-found" || code === "auth/invalid-credential") {
        toast.error("No account found with that email.");
      } else if (code === "auth/wrong-password") {
        toast.error("Wrong password. Try again.");
      } else if (code === "auth/too-many-requests") {
        toast.error("Too many attempts. Please wait a moment.");
      } else if (code === "auth/email-already-in-use") {
        toast.error("An account with this email already exists.");
      } else {
        toast.error("Sign-in failed. Check your email and password.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { resetPassword } = await import("@/lib/firebase");
      await resetPassword(email);
      toast.success("Reset link sent!");
      setMode("login");
    } catch {
      toast.error("Could not send reset email");
    } finally {
      setLoading(false);
    }
  };

  const strength = mode === "register" ? passwordStrength(password) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-brand-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand header above card */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔧</div>
          <h1 className="text-3xl font-bold text-white">HelpMyAppliances</h1>
          <p className="text-slate-300 text-sm mt-1">AI-powered appliance troubleshooting</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl px-8 py-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {mode === "login" && "Welcome back"}
              {mode === "register" && "Create your account"}
              {mode === "reset" && "Reset your password"}
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              {mode === "login" && "Sign in to manage your appliances"}
              {mode === "register" && "Free forever · No credit card required"}
              {mode === "reset" && "We'll send a reset link to your email"}
            </p>
          </div>

          {mode !== "reset" && (
            <>
              <button
                onClick={handleGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50 shadow-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 48 48">
                  <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" />
                  <path fill="#34A853" d="M6.3 14.7l7 5.1C15.2 16.5 19.3 14 24 14c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 16.3 2 9.7 7.4 6.3 14.7z" />
                  <path fill="#FBBC05" d="M24 46c5.6 0 10.4-1.9 14.2-5l-6.6-5.4C29.7 37.3 27 38 24 38c-6.1 0-11.2-4.1-13-9.7l-7 5.4C7.8 41.5 15.3 46 24 46z" />
                  <path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-.8 2.3-2.2 4.3-4.2 5.7l6.6 5.4C42.4 36.3 45 30.6 45 24c0-1.4-.2-2.7-.5-4z" />
                </svg>
                Continue with Google
              </button>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-xs text-gray-400 font-medium">OR</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>
            </>
          )}

          <form onSubmit={mode === "reset" ? handleReset : handleEmail} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow"
              />
            </div>
            {mode !== "reset" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                    className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {mode === "register" && password && strength && (
                  <div className="mt-2">
                    <div className="flex gap-1 h-1.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-full transition-colors ${
                            i <= strength.score ? strength.color : "bg-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Password strength: <span className="font-medium">{strength.label}</span>
                      {strength.score <= 1 && " — try adding numbers or symbols"}
                    </p>
                  </div>
                )}
                {mode === "register" && !password && (
                  <p className="text-xs text-gray-400 mt-1">Minimum 6 characters</p>
                )}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 active:scale-[0.99] transition-all disabled:opacity-50 shadow-sm"
            >
              {loading ? "Please wait…" : mode === "login" ? "Sign in" : mode === "register" ? "Create account" : "Send reset link"}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-gray-500 space-y-2">
            {mode === "login" && (
              <>
                <button onClick={() => setMode("reset")} className="text-brand-600 hover:underline block w-full">
                  Forgot password?
                </button>
                <span>
                  No account?{" "}
                  <button onClick={() => setMode("register")} className="text-brand-600 font-medium hover:underline">
                    Sign up free
                  </button>
                </span>
              </>
            )}
            {mode === "register" && (
              <span>
                Already have an account?{" "}
                <button onClick={() => setMode("login")} className="text-brand-600 font-medium hover:underline">
                  Sign in
                </button>
              </span>
            )}
            {mode === "reset" && (
              <button onClick={() => setMode("login")} className="text-brand-600 hover:underline">
                ← Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

