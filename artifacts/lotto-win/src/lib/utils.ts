import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isValidBDPhone(phone: string): boolean {
  return /^01[3-9]\d{8}$/.test(phone)
}

export function isValidTransactionId(txId: string): boolean {
  return /^[A-Z0-9]{8,15}$/.test(txId)
}

export function generateTicketRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const digits = '0123456789'
  let ref = 'TKT-'
  const pool = digits + chars
  for (let i = 0; i < 6; i++) {
    ref += pool[Math.floor(Math.random() * pool.length)]
  }
  return ref
}

export function generateDrawRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'
  const len = Math.floor(Math.random() * 4) + 5
  let ref = ''
  for (let i = 0; i < len; i++) {
    ref += chars[Math.floor(Math.random() * chars.length)]
  }
  return `DR-ID ${ref}`
}

export function formatDrawRef(id: string): string {
  const clean = id.replace(/-/g, '').toUpperCase().slice(0, 7)
  return `DR-ID ${clean}`
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('en-BD', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatTimeLeft(endDate: string): string {
  const end = new Date(endDate).getTime()
  const now = Date.now()
  const diff = end - now
  if (diff <= 0) return 'Ended'
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (days >= 2) return `${days} Days Left`
  if (days === 1) return `1 Day Left`
  if (hours > 0) return `${hours} Hours Left`
  if (mins > 0) return `${mins} Min Left`
  return 'Ending Soon'
}

export function formatCurrency(amount: number | string): string {
  return `৳${Number(amount).toLocaleString('en-BD')}`
}

export function formatJackpot(amount: number): string {
  if (amount >= 1_000_000) {
    const val = amount / 1_000_000
    return `${val % 1 === 0 ? val : val.toFixed(1)}MILLION ৳`
  }
  if (amount >= 100_000) {
    const val = amount / 100_000
    return `${val % 1 === 0 ? val : val.toFixed(1)} LAKH ৳`
  }
  if (amount >= 10_000) {
    const val = amount / 1_000
    return `${val % 1 === 0 ? val : val.toFixed(1)} THOUSANDS ৳`
  }
  return formatCurrency(amount)
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-BD', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getTimeLeft(endDate: string): string {
  const end = new Date(endDate).getTime()
  const now = Date.now()
  const diff = end - now
  if (diff <= 0) return 'Ended'
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (days > 0) return `${days}d ${hours}h left`
  if (hours > 0) return `${hours}h ${mins}m left`
  return `${mins}m left`
}
