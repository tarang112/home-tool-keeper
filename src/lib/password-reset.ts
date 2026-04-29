const RESET_EMAIL_KEY = "homestock_reset_email";
const RESET_REQUEST_KEY_PREFIX = "homestock_reset_requested_at:";
export const RESET_REQUEST_COOLDOWN_MS = 60_000;

export function getStoredResetEmail() {
  return localStorage.getItem(RESET_EMAIL_KEY) || sessionStorage.getItem(RESET_EMAIL_KEY) || "";
}

export function storeResetEmail(email: string) {
  localStorage.setItem(RESET_EMAIL_KEY, email);
  sessionStorage.setItem(RESET_EMAIL_KEY, email);
}

export function getResetCooldownSeconds(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return 0;

  const requestedAt = Number(localStorage.getItem(`${RESET_REQUEST_KEY_PREFIX}${normalizedEmail}`) || 0);
  const remainingMs = RESET_REQUEST_COOLDOWN_MS - (Date.now() - requestedAt);
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

export function markResetEmailRequested(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return;
  localStorage.setItem(`${RESET_REQUEST_KEY_PREFIX}${normalizedEmail}`, String(Date.now()));
}