const nodemailer = require('nodemailer');
require('dotenv').config();

async function testSMTP() {
    // Create a transporter using SMTP transport
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    try {
        // Send test email
        const info = await transporter.sendMail({
            from: '"Trading Journal" <noreply@yourdomain.com>',
            to: "test@example.com", // This will be caught by Mailtrap
            subject: 'SMTP Test Email',
            text: 'This is a test email to verify SMTP configuration.',
            html: '<p>This is a test email to verify SMTP configuration.</p>'
        });

        console.log('Test email sent successfully!');
        console.log('Message ID:', info.messageId);
    } catch (error) {
        console.error('Error sending test email:', error);
    }
}

// Run the test
testSMTP(); 