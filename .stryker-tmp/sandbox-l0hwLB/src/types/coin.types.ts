// @ts-nocheck
export interface GrantCoinsOptions {
  actorUserId: string;
  targetUserId: string;
  amount: number;
  serverId: string;
  details?: string;
}
export interface GrantCoinsResult {
  userId: string;
  availableBalance: number;
  lockedBalance: number;
  totalBalance: number;
}