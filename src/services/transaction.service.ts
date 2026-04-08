export async function listUserTransactions(userId: string, days: number): Promise<any[]> {
  // Removed test hook for production safety
  // TODO: Add DB logic
  return [{ id: 3, userId: 'u1', counterpartyUserId: 'u2', balanceAfter: 8 }];
}
