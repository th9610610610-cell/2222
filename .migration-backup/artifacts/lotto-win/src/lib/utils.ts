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

export function formatCurrency(amount: number | string): string {
  return `৳${Number(amount).toLocaleString('en-BD')}`
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
