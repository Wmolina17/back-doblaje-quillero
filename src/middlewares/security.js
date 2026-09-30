const OPERATOR_KEY = /^\$|\./;

const clean = (value) => {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !OPERATOR_KEY.test(key))
        .map(([key, nested]) => [key, clean(nested)]),
    );
  }
  return value;
};

const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === "object") req.body = clean(req.body);
  next();
};

const securityHeaders = (req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Cross-Origin-Resource-Policy": "same-site",
    "Cache-Control": "no-store",
  });
  next();
};

module.exports = { sanitizeBody, securityHeaders };
