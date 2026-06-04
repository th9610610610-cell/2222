import { isValidBDPhone, isValidTransactionId } from "./utils";

interface FraudAnalysis {
  score: number;
  flags: string[];
  isFlagged: boolean;
  recommendations: string[];
}

export function analyzeFraud(data: {
  amount: number;
  senderPhone: string;
  transactionId: string;
  isDuplicate?: boolean;
  isRepeat?: boolean;
}): FraudAnalysis {
  let score = 0;
  const flags: string[] = [];
  const recommendations: string[] = [];

  if (!isValidBDPhone(data.senderPhone)) {
    score += 50;
    flags.push("Non-BD phone format");
    recommendations.push("Verify phone is from Bangladesh");
  }

  if (!isValidTransactionId(data.transactionId)) {
    score += 30;
    flags.push("Suspicious transaction ID format");
    recommendations.push("Request manual verification");
  }

  if (data.isDuplicate) {
    score += 80;
    flags.push("Duplicate transaction ID");
    recommendations.push("REJECT: Transaction already used");
  }

  if (data.amount < 250 || data.amount > 10000) {
    score += 20;
    flags.push("Amount outside range");
  }

  if (data.amount >= 10000 && data.amount % 1000 === 0) {
    score += 10;
    flags.push("Round amount - possible dummy");
  }

  if (data.amount > 50000) {
    score += 20;
    flags.push("Unusually high amount");
  }

  if (data.isRepeat) {
    score += 15;
    flags.push("Multiple recent deposits");
  }

  const finalScore = Math.min(score, 100);
  const isFlagged = finalScore >= 70;

  return { score: finalScore, flags, isFlagged, recommendations };
}

export function generateFraudReport(userId: string, analysis: FraudAnalysis, userData?: any) {
  return {
    userId,
    fraudScore: analysis.score,
    riskLevel: analysis.score >= 80 ? "CRITICAL" : analysis.score >= 70 ? "HIGH" : analysis.score >= 50 ? "MEDIUM" : "LOW",
    flags: analysis.flags,
    recommendations: analysis.recommendations,
    action: analysis.isFlagged ? "REQUIRES ADMIN REVIEW" : "AUTO-APPROVED",
    userContext: userData,
    timestamp: new Date().toISOString(),
  };
}

export const FRAUD_THRESHOLDS = { SAFE: 40, REVIEW: 70, CRITICAL: 80 };