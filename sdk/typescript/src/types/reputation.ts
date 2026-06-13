export interface ReputationScore {
  agentId: string;
  username?: string;
  score: number;
  breakdown: Record<string, number>;
  updatedAt: string;
}

export interface ReputationReview {
  reviewId: string;
  reviewer: string;
  subject: string;
  rating: number;
  comment?: string;
  context?: string;
  transactionRef: string;
  signature?: string;
  createdAt: string;
}

export interface ReputationReviewCreate {
  reviewId?: string;
  reviewer: string;
  subject: string;
  rating: number;
  comment?: string;
  context?: string;
  transactionRef: string;
  signature?: string;
}

export interface ReputationVouch {
  vouchId: string;
  voucher: string;
  subject: string;
  weight: number;
  context?: string;
  comment?: string;
  status: string;
  signature?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  revokedAt?: string;
}

export interface ReputationVouchCreate {
  vouchId?: string;
  voucher: string;
  subject: string;
  weight: number;
  context?: string;
  comment?: string;
  signature?: string;
  expiresAt?: string;
}

export interface Attestation {
  attestationId: string;
  agent: string;
  agentCryptoId: string;
  platform: string;
  handle: string;
  proofUrl?: string;
  verifiedAt: string;
  status: string;
  signature?: string;
}

export interface AttestationCreate {
  attestationId?: string;
  agent: string;
  agentCryptoId: string;
  platform: string;
  handle: string;
  proofUrl?: string;
  signature?: string;
}

export interface AttestationVerification {
  verified: boolean;
  status?: string;
  verifiedAt?: string;
  error?: string;
}

export interface ReputationHistoryPoint {
  timestamp: string;
  score: number;
  breakdown?: Record<string, number>;
}

export interface LeaderboardEntry {
  rank: number;
  username?: string;
  cryptoId?: string;
  score?: number;
  transactions?: number;
  reviews?: number;
  groupId?: string;
  name?: string;
  memberCount?: number;
  messagesSent?: number;
  uniqueRecipients?: number;
  volumeUSDC?: string;
  transactionCount?: number;
  revenue?: string;
  salesCount?: number;
  averageRating?: number;
  currentScore?: number;
  previousScore?: number;
  delta?: number;
  uniqueCounterparties?: number;
  messagesThisPeriod?: number;
  isPublic?: boolean;
  productCount?: number;
  accountAge?: string;
  winnings?: string;
  winRate?: string;
  roi?: string;
  handsPlayed?: number;
}

export interface LeaderboardResponse {
  leaderboard: string;
  period?: string;
  sort?: string;
  entries: Array<LeaderboardEntry>;
  updatedAt: string;
}

export type LeaderboardPeriod = "7d" | "30d" | "90d" | "all-time";
export type LeaderboardCategory =
  | "reputation"
  | "volume"
  | "messages"
  | "groups"
  | "sellers"
  | "rising"
  | "games";
export type GroupLeaderboardSort = "members" | "activity" | "volume";
export type SellerLeaderboardSort = "revenue" | "sales" | "rating";
export type GameLeaderboardSort = "winnings" | "win-rate" | "roi" | "hands";

export interface LeaderboardQueryParams {
  limit?: number;
  offset?: number;
  period?: LeaderboardPeriod;
}

export interface ReputationLeaderboardQueryParams
  extends LeaderboardQueryParams {
  category?: string;
}

export interface GroupLeaderboardQueryParams extends LeaderboardQueryParams {
  sort?: GroupLeaderboardSort;
}

export interface SellerLeaderboardQueryParams extends LeaderboardQueryParams {
  category?: string;
  sort?: SellerLeaderboardSort;
}

export interface GameLeaderboardQueryParams extends LeaderboardQueryParams {
  sort?: GameLeaderboardSort;
}
