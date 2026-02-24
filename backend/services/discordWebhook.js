const axios = require('axios');

/**
 * Send a Discord webhook notification when an event is published
 * @param {Object} organizer - Organizer document
 * @param {Object} event - Event document
 */
exports.sendDiscordNotification = async (organizer, event) => {
    // Use per-organizer webhook URL; fall back to global env var
    const webhookUrl = organizer.discordWebhookUrl || process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
        console.log('[Discord] Skipped — no webhook URL configured for organizer or in env');
        return;
    }

    const embed = {
        title: `🎉 New Event Published: ${event.name}`,
        description: event.description?.slice(0, 200) || 'No description',
        color: 0x4F46E5, // Indigo accent
        fields: [
            { name: 'Type', value: event.eventType === 'merchandise' ? '🛍️ Merchandise' : '📋 Normal Event', inline: true },
            { name: 'Organizer', value: organizer.organizerName || 'Unknown', inline: true },
            { name: 'Eligibility', value: event.eligibility === 'all' ? 'Everyone' : event.eligibility === 'iiit-only' ? 'IIIT Only' : 'Non-IIIT Only', inline: true },
            { name: 'Start Date', value: event.eventStartDate ? new Date(event.eventStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBA', inline: true },
            { name: 'Registration Deadline', value: event.registrationDeadline ? new Date(event.registrationDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'None', inline: true },
            { name: 'Fee', value: event.registrationFee > 0 ? `₹${event.registrationFee}` : 'Free', inline: true },
        ],
        footer: { text: 'Felicity 2026 Event Management' },
        timestamp: new Date().toISOString(),
    };

    if (event.registrationLimit > 0) {
        embed.fields.push({ name: 'Spots', value: `${event.registrationLimit} available`, inline: true });
    }

    try {
        await axios.post(webhookUrl, {
            username: 'Felicity Bot',
            avatar_url: 'https://i.imgur.com/4M34hi2.png',
            embeds: [embed],
        });
        console.log(`[Discord] Sent notification for "${event.name}"`);
    } catch (err) {
        console.error(`[Discord] Failed:`, err.message);
    }
};
