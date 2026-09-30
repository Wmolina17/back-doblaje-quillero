require("dotenv").config();

process.env.MONGO_URI ||= process.env.MONGODB_URI;

const required = ["MONGO_URI", "ADMIN_USER", "ADMIN_SECRET"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(`Faltan variables de entorno: ${missing.join(", ")}`);
}

const list = (value) =>
  (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

module.exports = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI,
  adminUser: process.env.ADMIN_USER,
  adminSecret: process.env.ADMIN_SECRET,
  corsOrigins: list(process.env.CORS_ORIGINS),
  brevoApiKey: process.env.BREVO_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM || "",
  siteUrl: (process.env.SITE_URL || "https://doblajequillero.com").replace(/\/$/, ""),
  dnsServers: list(process.env.DNS_SERVERS),
};
