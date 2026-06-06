const nodemailer = require('nodemailer');

module.exports = async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, cc, subject, body } = req.body;

  // Validate env vars are set
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return res.status(500).json({
      error: 'Email credentials not configured. Add EMAIL_USER and EMAIL_PASS in Vercel environment variables.'
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Gmail App Password (16 chars, not your real password)
      },
    });

    const mailOptions = {
      from: `Masterform Systems <${process.env.EMAIL_USER}>`,
      to: to || process.env.EMAIL_TO || 'genecarlogallardo@gmail.com',
      subject: subject || 'Masterform Order List',
      text: body || '',
    };

    if (cc && cc.trim()) mailOptions.cc = cc.trim();

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ success: true, message: 'Email sent successfully' });

  } catch (err) {
    console.error('Email send error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
