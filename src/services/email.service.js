const env = require("../config/env");
const Settings = require("../models/Settings");
const { approvedTicketTemplate } = require("./email.templates");

const sendEmail = async ({ senderName, to, name, subject, html }) => {
  if (!env.brevoApiKey || !env.emailFrom) {
    console.warn("Correo no enviado: falta BREVO_API_KEY o EMAIL_FROM");
    return false;
  }
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": env.brevoApiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: senderName, email: env.emailFrom },
      to: [{ email: to, name }],
      subject,
      htmlContent: html,
    }),
  });
  if (!response.ok) {
    throw new Error(`Brevo respondió ${response.status}: ${await response.text()}`);
  }
  return true;
};

const sendApprovedTicketEmail = async ({ ticket, raffle, resend = false }) => {
  const settings = await Settings.getSingleton();
  return sendEmail({
    senderName: settings.siteName,
    to: ticket.email,
    name: ticket.fullName,
    subject: resend
      ? `Tus números de ${raffle.name} | ${settings.siteName}`
      : `¡Compra confirmada! Tus números de ${raffle.name}`,
    html: approvedTicketTemplate({ settings, ticket, raffle, resend }),
  });
};

module.exports = { sendApprovedTicketEmail };
