const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9\s-]{7,20}$/;
const IMAGE_DATA_URL_REGEX = /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/;

const IMAGE_LIMITS = {
  voucherBytes: 400 * 1024,
  raffleImageBytes: 600 * 1024,
  raffleImages: 8,
};

const dataUrlBytes = (dataUrl) => Math.ceil(((dataUrl.length - dataUrl.indexOf(",") - 1) * 3) / 4);

const isValidImage = (value, maxBytes) =>
  typeof value === "string" && IMAGE_DATA_URL_REGEX.test(value) && dataUrlBytes(value) <= maxBytes;

const isHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};

module.exports = {
  escapeRegex,
  escapeHtml,
  isHttpUrl,
  EMAIL_REGEX,
  PHONE_REGEX,
  IMAGE_LIMITS,
  isValidImage,
};
