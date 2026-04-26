/**
 * Dev-mode auth helpers.
 * When NEXT_PUBLIC_DEV_MODE=true, the app skips Firebase entirely.
 * The API token is 'dev:{email}' — accepted by the backend when DEV_AUTH=true.
 */

const KEY = "hma_dev_email";

export const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true";

export function devGetEmail(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY);
}

export function devSetEmail(email: string) {
  localStorage.setItem(KEY, email);
}

export function devClear() {
  localStorage.removeItem(KEY);
}

export function devToken(email: string): string {
  return `dev:${email}`;
}
