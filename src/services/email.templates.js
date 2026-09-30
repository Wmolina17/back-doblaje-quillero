const env = require("../config/env");
const { escapeHtml } = require("../utils/validation");

const COLORS = {
  page: "#050505",
  card: "#111110",
  border: "#3A2D0D",
  gold: "#D4AF37",
  goldLight: "#F5D77A",
  text: "#E8E6E1",
  muted: "#9A927F",
};

const SOCIAL_LABELS = {
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook: "Facebook",
  facebookAlt: "Doblaje Quillero TV",
  youtube: "YouTube",
  x: "X",
  threads: "Threads",
  kick: "Kick",
  twitch: "Twitch",
  telegram: "Telegram",
  whatsappChannel: "Canal de WhatsApp",
};

const formatDate = (date) =>
  new Date(date).toLocaleDateString("es-CO", {
    dateStyle: "long",
    timeZone: "America/Bogota",
  });

const formatMoney = (value, currency) =>
  currency === "USD"
    ? `${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)} USD`
    : new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);

const whatsappUrl = (phone) => `https://wa.me/${String(phone).replace(/\D/g, "")}`;

const logoUrl = (settings) => settings.logoUrl || `${env.siteUrl}/logo-email.jpg`;

const button = (href, label) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:24px auto 0;">
    <tr>
      <td bgcolor="${COLORS.gold}" style="border-radius:12px;">
        <a href="${escapeHtml(href)}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#050505;text-decoration:none;border-radius:12px;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;

const infoRow = (label, value) => `
  <tr>
    <td style="padding:8px 0;border-bottom:1px solid #2A2415;color:${COLORS.muted};font-size:13px;">${escapeHtml(label)}</td>
    <td align="right" style="padding:8px 0;border-bottom:1px solid #2A2415;color:${COLORS.text};font-size:14px;font-weight:bold;">${escapeHtml(value)}</td>
  </tr>`;

const renderCodes = (codes) =>
  codes
    .map(
      (code) =>
        `<span style="display:inline-block;margin:4px;padding:10px 16px;border-radius:10px;background:#1C1810;border:1px solid ${COLORS.gold};color:${COLORS.goldLight};font-family:'Courier New',monospace;font-size:20px;font-weight:bold;letter-spacing:3px;">${escapeHtml(code)}</span>`,
    )
    .join("");

const renderLayout = ({ settings, preheader, body }) => {
  const siteName = escapeHtml(settings.siteName);

  const socials = Object.entries(SOCIAL_LABELS)
    .filter(([key]) => settings.socials?.[key])
    .map(
      ([key, label]) =>
        `<a href="${escapeHtml(settings.socials[key])}" target="_blank" style="display:inline-block;margin:4px;padding:7px 14px;border:1px solid ${COLORS.border};border-radius:999px;color:${COLORS.goldLight};font-size:12px;font-weight:bold;text-decoration:none;">${label}</a>`,
    )
    .join("");

  const whatsapp = settings.supportWhatsapp || settings.supportPhone;
  const contact = [
    whatsapp && `WhatsApp: <a href="${whatsappUrl(whatsapp)}" style="color:${COLORS.goldLight};text-decoration:none;">${escapeHtml(whatsapp)}</a>`,
    settings.supportEmail &&
      `Correo: <a href="mailto:${escapeHtml(settings.supportEmail)}" style="color:${COLORS.goldLight};text-decoration:none;">${escapeHtml(settings.supportEmail)}</a>`,
    settings.supportHours && `Horario: ${escapeHtml(settings.supportHours)}`,
  ]
    .filter(Boolean)
    .join("<br>");

  const advertising = settings.advertisingPhone
    ? `<p style="margin:12px 0 0;color:${COLORS.muted};font-size:12px;">Publicidad: <a href="${whatsappUrl(settings.advertisingPhone)}" style="color:${COLORS.goldLight};text-decoration:none;">${escapeHtml(settings.advertisingPhone)}</a></p>`
    : "";

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>${siteName}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.page};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.page}">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:${COLORS.card};border:1px solid ${COLORS.border};border-radius:18px;font-family:Arial,Helvetica,sans-serif;">
          <tr>
            <td align="center" style="padding:32px 24px 20px;border-bottom:2px solid ${COLORS.gold};">
              <img src="${escapeHtml(logoUrl(settings))}" alt="${siteName}" width="110" height="110" style="display:block;width:110px;height:110px;border-radius:55px;border:3px solid ${COLORS.gold};">
              <p style="margin:14px 0 0;color:${COLORS.gold};font-size:24px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">${siteName}</p>
              ${settings.tagline ? `<p style="margin:4px 0 0;color:${COLORS.muted};font-size:13px;">${escapeHtml(settings.tagline)}</p>` : ""}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:32px 28px;color:${COLORS.text};font-size:15px;line-height:1.6;">${body}</td>
          </tr>
          <tr>
            <td align="center" style="padding:24px;border-top:1px solid #2A2415;">
              ${socials ? `<p style="margin:0 0 10px;color:${COLORS.muted};font-size:13px;">Síguenos en nuestras redes</p><div>${socials}</div>` : ""}
              ${contact ? `<p style="margin:18px 0 0;color:${COLORS.muted};font-size:12px;line-height:1.8;">${contact}</p>` : ""}
              ${advertising}
              <p style="margin:18px 0 0;color:#6E685B;font-size:11px;">© ${new Date().getFullYear()} ${siteName} · <a href="${env.siteUrl}" style="color:#6E685B;">${escapeHtml(env.siteUrl.replace(/^https?:\/\//, ""))}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

const approvedTicketTemplate = ({ settings, ticket, raffle, resend }) => {
  const title = resend ? "Aquí están de nuevo tus números" : "¡Tu compra fue aprobada!";
  const body = `
    <p style="margin:0;color:${COLORS.gold};font-size:12px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;">${escapeHtml(raffle.name)}</p>
    <h1 style="margin:8px 0 12px;color:${COLORS.goldLight};font-size:26px;">${title}</h1>
    <p style="margin:0 0 24px;">Hola <strong>${escapeHtml(ticket.fullName)}</strong>, ¡gracias por participar! Estos son tus números:</p>
    <div style="margin:0 0 24px;">${renderCodes(ticket.approvalCodes)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="text-align:left;">
      ${infoRow("Boletos", String(ticket.approvalCodes.length))}
      ${infoRow("Método de pago", ticket.paymentMethod)}
      ${infoRow("Total pagado", formatMoney(ticket.amountPaid, ticket.currency))}
      ${infoRow("Referencia", ticket.reference)}
      ${raffle.drawDate ? infoRow("Fecha del evento", formatDate(raffle.drawDate)) : ""}
    </table>
    <p style="margin:24px 0 0;color:${COLORS.muted};font-size:13px;">Los números se asignan de forma aleatoria. Entre más boletos, más oportunidades. ¡Mucha suerte, mi llave!</p>
    ${button(env.siteUrl, "Ver el evento")}`;

  return renderLayout({
    settings,
    preheader: `Tus números para ${raffle.name}: ${ticket.approvalCodes.slice(0, 5).join(", ")}`,
    body,
  });
};

module.exports = { approvedTicketTemplate };
