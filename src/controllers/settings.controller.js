const Settings = require("../models/Settings");
const { HttpError } = require("../utils/http");
const { isHttpUrl, EMAIL_REGEX, PHONE_REGEX } = require("../utils/validation");

const TEXT_FIELDS = ["siteName", "tagline", "aboutText", "supportHours"];

const get = async (req, res) => {
  res.json(await Settings.getSingleton());
};

const update = async (req, res) => {
  const settings = await Settings.getSingleton();
  const body = req.body;

  for (const key of TEXT_FIELDS) {
    if (body[key] !== undefined) settings[key] = String(body[key]).trim();
  }

  if (body.logoUrl !== undefined) {
    const logoUrl = String(body.logoUrl).trim();
    if (logoUrl && !isHttpUrl(logoUrl)) throw new HttpError(400, "URL del logo inválida.");
    settings.logoUrl = logoUrl;
  }

  if (body.supportEmail !== undefined) {
    const email = String(body.supportEmail).trim();
    if (email && !EMAIL_REGEX.test(email)) throw new HttpError(400, "Correo de soporte inválido.");
    settings.supportEmail = email;
  }

  for (const key of ["supportPhone", "supportWhatsapp", "advertisingPhone"]) {
    if (body[key] === undefined) continue;
    const phone = String(body[key]).trim();
    if (phone && !PHONE_REGEX.test(phone)) throw new HttpError(400, "Número de teléfono inválido.");
    settings[key] = phone;
  }

  if (body.usdRate !== undefined) {
    const rate = Number(body.usdRate);
    if (!Number.isFinite(rate) || rate <= 0) throw new HttpError(400, "Tasa del dólar inválida.");
    settings.usdRate = rate;
  }

  if (body.socials && typeof body.socials === "object") {
    for (const key of Settings.SOCIAL_KEYS) {
      if (body.socials[key] === undefined) continue;
      const url = String(body.socials[key]).trim();
      if (url && !isHttpUrl(url)) throw new HttpError(400, `Enlace inválido para ${key}.`);
      settings.socials[key] = url;
    }
  }

  await settings.save();
  res.json(settings);
};

module.exports = { get, update };
