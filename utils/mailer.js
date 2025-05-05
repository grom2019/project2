const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendConfirmationEmail = async (to, token) => {
  const url = `${process.env.BASE_URL}/verify-email?token=${token}`;
  const options = {
    from: process.env.EMAIL_USER,
    to,
    subject: 'Підтвердження реєстрації',
    html: `<p>Натисніть <a href="${url}">тут</a>, щоб підтвердити свою реєстрацію</p>`,
  };

  try {
    await transporter.sendMail(options);
    console.log('Email sent successfully');
  } catch (err) {
    console.error('Error sending email:', err);
    throw new Error('Error sending email');
  }
};

module.exports = sendConfirmationEmail;
