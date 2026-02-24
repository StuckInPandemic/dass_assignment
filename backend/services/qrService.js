const crypto = require('crypto');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// Ensure qrcodes directory exists
const qrDir = path.join(__dirname, '..', 'uploads', 'qrcodes');
if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });

/**
 * Generate a unique ticket ID: FEL-2026-XXXXXX
 */
exports.generateTicketId = () => {
    const year = new Date().getFullYear();
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `FEL-${year}-${random}`;
};

/**
 * Generate a QR code and save it as a PNG file
 * @param {Object} data - Data to encode in the QR code
 * @returns {Promise<string>} URL path to the saved PNG file
 */
exports.generateQR = async (data) => {
    const jsonStr = JSON.stringify(data);
    const buffer = await QRCode.toBuffer(jsonStr, {
        type: 'png',
        width: 300,
        margin: 2,
        color: { dark: '#1A1A1A', light: '#FFFFFF' },
    });

    const filename = `${data.ticketId || crypto.randomBytes(6).toString('hex')}.png`;
    const filePath = path.join(qrDir, filename);
    fs.writeFileSync(filePath, buffer);

    return `/uploads/qrcodes/${filename}`;
};
