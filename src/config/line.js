// ========================================
// LINE API Configuration
// ========================================

const { Client } = require('@line/bot-sdk');

const config = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// สร้าง LINE Client
const client = new Client(config);

// Admin Group ID
const ADMIN_GROUP_ID = process.env.LINE_ADMIN_GROUP_ID;

// Timezone
const TIMEZONE = 'Asia/Bangkok';

module.exports = {
    client,
    config,
    ADMIN_GROUP_ID,
    TIMEZONE,
};
