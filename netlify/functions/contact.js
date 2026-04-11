const nodemailer = require('nodemailer');
const https = require('https');

const rateLimitMap = new Map();
const RATE_LIMIT = 5;
const WINDOW_MS = 15 * 60 * 1000;

function isRateLimited(ip) {
    const now = Date.now();
    const userRequests = rateLimitMap.get(ip) || [];
    const recentRequests = userRequests.filter(time => now - time < WINDOW_MS);
    if (recentRequests.length >= RATE_LIMIT) return true;
    recentRequests.push(now);
    rateLimitMap.set(ip, recentRequests);
    return false;
}

function verifyRecaptcha(token) {
    return new Promise((resolve, reject) => {
        const params = `secret=${process.env.RECAPTCHA_SECRET}&response=${token}`;
        const options = {
            hostname: 'www.google.com',
            path: '/recaptcha/api/siteverify',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': params.length,
            },
        };

        const req = https.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });

        req.on('error', reject);
        req.write(params);
        req.end();
    });
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const ip = event.headers['x-forwarded-for'] || event.headers['client-ip'];
    if (isRateLimited(ip)) {
        return { statusCode: 429, body: JSON.stringify({ error: 'Too many requests.' }) };
    }

    const { name, email, phone, service, message, token } = JSON.parse(event.body);

    // Verify reCAPTCHA
    const recaptchaResult = await verifyRecaptcha(token);
    if (!recaptchaResult.success || recaptchaResult.score < 0.5) {
        return { statusCode: 403, body: JSON.stringify({ error: 'reCAPTCHA failed.' }) };
    }

    console.log("USER:", process.env.EMAIL_USER);
    console.log("PASS LENGTH:", process.env.EMAIL_PASS?.length);


    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER,
            replyTo: email,
            subject: `New enquiry from ${name} (${email})`,
            text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nService: ${service}\nMessage: ${message}`,
        });

        return { statusCode: 200, body: JSON.stringify({ message: 'Email sent successfully' }) };
    } catch (error) {
        console.log('EMAIL ERROR:', error.message);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};