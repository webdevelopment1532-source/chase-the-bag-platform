// Personalized offers and targeted messages
import { getUserReward } from './advanced-commands';

export function getPersonalizedOffer(userId: string) {
  const reward = getUserReward(userId);
  if (reward.tier === 'VIP') {
    return '🎁 VIP Bonus: You get a 10% cashback on your next game!';
  } else if (reward.tier === 'Gold') {
    return '✨ Gold Bonus: Play 3 games this week for a $20 bonus!';
  } else if (reward.tier === 'Silver') {
    return '💎 Silver Bonus: Refer a friend and get double points!';
  } else {
    return '🚀 Play more to unlock exclusive bonuses and rewards!';
  }
}
