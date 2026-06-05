export function calculateFraudScore(data: {
  senderPhone: string
  trxId: string
  amount: number
}): { score: number; flags: string[] } {
  let score = 0
  const flags: string[] = []

  if (!/^01[3-9]\d{8}$/.test(data.senderPhone)) {
    score += 50
    flags.push('Non-BD phone number')
  }

  if (!/^[A-Z0-9]{8,15}$/.test(data.trxId)) {
    score += 30
    flags.push('Suspicious TrxID format')
  }

  if (data.amount >= 50000) {
    score += 20
    flags.push('Very high amount')
  }

  if (data.amount >= 10000 && data.amount % 1000 === 0) {
    score += 10
    flags.push('Round high amount')
  }

  return { score, flags }
}
