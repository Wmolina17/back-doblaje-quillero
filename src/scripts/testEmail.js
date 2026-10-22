const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const apiKey = process.env.BREVO_API_KEY;
const senderEmail = process.env.EMAIL_FROM;
const siteUrl = (process.env.SITE_URL || "https://doblajequillero.com").replace(/\/$/, "");

if (!apiKey || !senderEmail) {
  console.error("Faltan BREVO_API_KEY o EMAIL_FROM en backend/.env");
  process.exit(1);
}

const htmlContent = `<!doctype html>
<html lang="es">
<body style="margin:0;padding:32px;background:#050505;color:#E8E6E1;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:auto;background:#111110;border:1px solid #3A2D0D;border-radius:18px;">
    <tr><td align="center" style="padding:32px 24px;border-bottom:2px solid #D4AF37;">
      <img src="${siteUrl}/logo-email.jpg" alt="Doblaje Quillero" width="96" height="96" style="border:3px solid #D4AF37;border-radius:50%;">
      <h1 style="margin:16px 0 0;color:#D4AF37;font-size:22px;">Prueba de correo</h1>
    </td></tr>
    <tr><td align="center" style="padding:28px;line-height:1.6;">
      <p>Este mensaje confirma que la configuracion de correo de Doblaje Quillero funciona.</p>
      <p style="color:#9A927F;font-size:13px;">Es un correo de prueba; no corresponde a una compra ni a una aprobacion de stickers.</p>
    </td></tr>
  </table>
</body>
</html>`;

(async () => {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: "Doblaje Quillero", email: senderEmail },
      to: [{ email: senderEmail }],
      subject: "[PRUEBA] Configuracion de correo | Doblaje Quillero",
      htmlContent,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    console.error(`Brevo rechazo el envio (${response.status}): ${body.message || body.code || "error sin detalle"}`);
    process.exit(1);
  }

  const result = await response.json();
  console.log(`Correo de prueba aceptado por Brevo para ${senderEmail}. messageId: ${result.messageId || "no informado"}`);
})().catch((error) => {
  console.error(`Fallo al contactar Brevo: ${error.message}`);
  process.exit(1);
});
