export interface ParticipationContext {
  userId: string;
  isAdmin?: boolean;
  isOwner?: boolean;
  isInGame?: boolean;
  isInLive?: boolean;
}

export interface StakeDropRouting {
  totalDrop: number;
  mainWalletAddress: string;
  exchangeWalletAddress: string;
  toMainWallet: number;
  toExchangeWallet: number;
  exchangeFeeAdded: number;
  splitPercentToMain: number;
}

function parseCsvEnv(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function isPayoutEligible(context: ParticipationContext): boolean {
  return Boolean(context.isInGame || context.isInLive || context.isAdmin || context.isOwner);
}

export function assertPayoutEligible(context: ParticipationContext): void {
  if (!isPayoutEligible(context)) {
    throw new Error('Payouts are restricted to game/live participants only.');
  }
}

export function isAuthorizedScraper(context: ParticipationContext): boolean {
  const allowedUserIds = parseCsvEnv(process.env.CTB_ALLOWED_SCRAPER_IDS);
  if (context.isOwner || context.isAdmin) return true;
  return allowedUserIds.includes(context.userId);
}

export function assertAuthorizedScraper(context: ParticipationContext): void {
  if (!isAuthorizedScraper(context)) {
    throw new Error('Scraping for payout is restricted to authorized game/live operators.');
  }
}

export function calculateStakeDropRouting(totalDrop: number, exchangeFee = 0): StakeDropRouting {
  if (!Number.isFinite(totalDrop) || totalDrop <= 0) {
    throw new Error('Stake drop amount must be a positive number.');
  }
  if (!Number.isFinite(exchangeFee) || exchangeFee < 0) {
    throw new Error('Exchange fee must be zero or a positive number.');
  }

  const splitPercentToMain = Number(process.env.CTB_MAIN_WALLET_SPLIT_PERCENT ?? 70);
  if (!Number.isFinite(splitPercentToMain) || splitPercentToMain < 0 || splitPercentToMain > 100) {
    throw new Error('CTB_MAIN_WALLET_SPLIT_PERCENT must be between 0 and 100.');
  }

  const mainWalletAddress = getRequiredEnv('CTB_MAIN_HOT_WALLET_ADDRESS');
  const exchangeWalletAddress = getRequiredEnv('CTB_EXCHANGE_HOT_WALLET_ADDRESS');

  const toMainWallet = Number(((totalDrop * splitPercentToMain) / 100).toFixed(8));
  const baseExchangeAmount = Number((totalDrop - toMainWallet).toFixed(8));
  const toExchangeWallet = Number((baseExchangeAmount + exchangeFee).toFixed(8));

  return {
    totalDrop: Number(totalDrop.toFixed(8)),
    mainWalletAddress,
    exchangeWalletAddress,
    toMainWallet,
    toExchangeWallet,
    exchangeFeeAdded: Number(exchangeFee.toFixed(8)),
    splitPercentToMain,
  };
}