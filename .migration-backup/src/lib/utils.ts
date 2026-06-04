import crypto from "crypto";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(32).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, hash: string): boolean {
  const [salt, originalHash] = hash.split(":");
  const newHash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return newHash === originalHash;
}

export function generateTicketRef(): string {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let ref = "TKT-";
  for (let i = 0; i < 6; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ref;
}

export function isValidBDPhone(phone: string): boolean {
  const bdPhoneRegex = /^01\d{9}$/;
  return bdPhoneRegex.test(phone);
}

export function isValidTransactionId(trxId: string): boolean {
  const trxRegex = /^[A-Z0-9]{6,15}$/i;
  return trxRegex.test(trxId);
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `৳${num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` ;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function getTimeRemaining(endDate: Date | string) {
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isEnded: true };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / 1000 / 60) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    isEnded: false,
  };
}

export function selectRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function successResponse(data: any, message: string = "Success") {
  return { success: true, message, data, timestamp: new Date().toISOString() };
}

export function errorResponse(message: string, code: string = "ERROR", details?: any) {
  return { success: false, message, code, details, timestamp: new Date().toISOString() };
}

export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  constructor(private maxAttempts: number = 5, private windowMs: number = 15 * 60 * 1000) {}
  isAllowed(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    const validAttempts = attempts.filter((time) => now - time < this.windowMs);
    if (validAttempts.length >= this.maxAttempts) return false;
    validAttempts.push(now);
    this.attempts.set(key, validAttempts);
    return true;
  }
  getRemaining(key: string): number {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    const validAttempts = attempts.filter((time) => now - time < this.windowMs);
    return Math.max(0, this.maxAttempts - validAttempts.length);
  }
  reset(key: string): void {
    this.attempts.delete(key);
  }
}