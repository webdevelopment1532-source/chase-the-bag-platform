"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPersonalizedOffer = getPersonalizedOffer;
// Personalized offers and targeted messages
const advanced_commands_1 = require("./advanced-commands");
function getPersonalizedOffer(userId) {
    const reward = (0, advanced_commands_1.getUserReward)(userId);
    if (reward.tier === 'VIP') {
        return '🎁 VIP Bonus: You get a 10% cashback on your next game!';
    }
    else if (reward.tier === 'Gold') {
        return '✨ Gold Bonus: Play 3 games this week for a $20 bonus!';
    }
    else if (reward.tier === 'Silver') {
        return '💎 Silver Bonus: Refer a friend and get double points!';
    }
    else {
        return '🚀 Play more to unlock exclusive bonuses and rewards!';
    }
}
