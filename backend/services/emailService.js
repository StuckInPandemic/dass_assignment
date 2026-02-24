const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/**
 * Send ticket confirmation email
 * @param {string} to - Recipient email
 * @param {Object} event - Event document
 * @param {string} ticketId - Generated ticket ID
 * @param {string} qrFilePath - File path to the QR code PNG (e.g. /uploads/qrcodes/xxx.png)
 * @param {Object} [extras] - Additional info (merch selections, total amount)
 */
exports.sendTicketEmail = async (to, event, ticketId, qrFilePath, extras = {}) => {
    // Skip if SMTP not configured
    if (!process.env.SMTP_USER || process.env.SMTP_USER === 'your-email@gmail.com') {
        console.log(`[Email] Skipped (SMTP not configured) — Ticket ${ticketId} for ${to}`);
        return;
    }

    const qrCid = 'qrcode@felicity';
    // Read PNG file from disk
    const absolutePath = path.join(__dirname, '..', qrFilePath);
    const qrBuffer = fs.readFileSync(absolutePath);

    let itemsHtml = '';
    if (extras.merchSelections && extras.merchSelections.length > 0) {
        itemsHtml = `
            <h3 style="margin-top:16px;">Items Purchased</h3>
            <table style="width:100%;border-collapse:collapse;">
                <tr style="background:#f3f4f6;"><th style="padding:8px;text-align:left;">Item</th><th>Variant</th><th>Qty</th><th>Price</th></tr>
                ${extras.merchSelections.map(s => `
                    <tr style="border-bottom:1px solid #e5e7eb;">
                        <td style="padding:8px;">${s.itemName}</td>
                        <td style="padding:8px;">${s.variant.size || ''}${s.variant.color ? ' / ' + s.variant.color : ''}</td>
                        <td style="padding:8px;">${s.quantity}</td>
                        <td style="padding:8px;">₹${s.price * s.quantity}</td>
                    </tr>
                `).join('')}
            </table>
            <p style="margin-top:8px;font-weight:600;">Total: ₹${extras.totalAmount || 0}</p>
        `;
    }

    const html = `
        <div style="font-family:'Inter',Arial,sans-serif;max-width:500px;margin:0 auto;padding:24px;">
            <h2 style="color:#4F46E5;">✦ Felicity 2026</h2>
            <h3>Registration Confirmed!</h3>
            <div style="background:#f7f7f8;border-radius:8px;padding:16px;margin:16px 0;">
                <p style="margin:0 0 4px;font-weight:600;font-size:18px;">${event.name}</p>
                <p style="margin:0;color:#6b7280;">Ticket ID: <strong>${ticketId}</strong></p>
            </div>
            <div style="text-align:center;margin:20px 0;">
                <img src="cid:${qrCid}" alt="QR Code" style="width:200px;height:200px;" />
            </div>
            ${itemsHtml}
            <p style="color:#9ca3af;font-size:12px;margin-top:24px;">
                Present this QR code at the event venue. This email serves as your ticket.
            </p>
        </div>
    `;

    try {
        await transporter.sendMail({
            from: `"Felicity 2026" <${process.env.SMTP_USER}>`,
            to,
            subject: `Ticket Confirmed — ${event.name} [${ticketId}]`,
            html,
            attachments: [{
                filename: 'qrcode.png',
                content: qrBuffer,
                cid: qrCid,
            }],
        });
        console.log(`[Email] Sent ticket ${ticketId} to ${to}`);
    } catch (err) {
        console.error(`[Email] Failed for ${ticketId}:`, err.message);
    }
};
