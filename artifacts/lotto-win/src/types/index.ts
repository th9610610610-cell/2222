export type UserRole = 'user' | 'moderator' | 'admin'

export interface User {
  id: string
  full_name: string
  phone: string
  role: UserRole
  balance: number
  total_deposited: number
  total_won: number
  tickets_bought: number
  is_flagged: boolean
  created_at: string
}

export type DrawStatus = 'upcoming' | 'live' | 'ended' | 'rescheduled'

export interface Draw {
  id: string
  draw_number: number | null
  name: string
  jackpot: number
  ticket_price: number
  max_tickets: number
  tickets_sold: number
  status: DrawStatus
  end_date: string
  winner_id: string | null
  winner_name: string | null
  winner_ticket: string | null
  created_at: string
}

export interface Ticket {
  id: string
  ticket_ref: string
  draw_id: string
  user_id: string
  claim_code: string
  is_winner: boolean
  created_at: string
  draw?: Draw
}

export type DepositStatus = 'pending' | 'approved' | 'rejected'
export type PaymentMethod = 'bkash' | 'nagad' | 'rocket'

export interface Deposit {
  id: string
  user_id: string
  amount: number
  method: PaymentMethod
  sender_phone: string
  trx_id: string
  status: DepositStatus
  rejection_reason: string | null
  fraud_score: number
  fraud_flags: string[]
  created_at: string
  user?: { full_name: string; phone: string }
}

export interface Notification {
  id: string
  user_id: string
  message: string
  is_read: boolean
  is_pinned: boolean
  created_at: string
}

export interface Settings {
  bkash_number: string
  nagad_number: string
  rocket_number: string
  whatsapp_number: string
  payment_number: string
  announcement: string
}
