const mongoose = require("mongoose");

const SOCIAL_KEYS = [
  "tiktok",
  "instagram",
  "facebook",
  "facebookAlt",
  "youtube",
  "x",
  "threads",
  "kick",
  "twitch",
  "telegram",
  "whatsappChannel",
];

const socials = Object.fromEntries(
  SOCIAL_KEYS.map((key) => [key, { type: String, trim: true, default: "" }]),
);

const SettingsSchema = new mongoose.Schema(
  {
    siteName: { type: String, trim: true, default: "Doblaje Quillero" },
    tagline: { type: String, trim: true, default: "Eventos oficiales de Doblaje Quillero Inc." },
    aboutText: { type: String, trim: true, default: "" },
    logoUrl: { type: String, trim: true, default: "" },
    supportPhone: { type: String, trim: true, default: "" },
    supportWhatsapp: { type: String, trim: true, default: "" },
    supportEmail: { type: String, trim: true, default: "" },
    supportHours: { type: String, trim: true, default: "" },
    advertisingPhone: { type: String, trim: true, default: "" },
    usdRate: { type: Number, default: 4000, min: 1 },
    socials,
  },
  { timestamps: true },
);

SettingsSchema.statics.SOCIAL_KEYS = SOCIAL_KEYS;

SettingsSchema.statics.getSingleton = async function getSingleton() {
  const existing = await this.findOne();
  if (existing) return existing;
  return this.create({});
};

module.exports = mongoose.model("Settings", SettingsSchema);
