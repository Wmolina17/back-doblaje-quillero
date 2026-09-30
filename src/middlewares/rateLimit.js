const createRateLimiter = ({ windowMs, max }) => {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      if (hits.size > 5000) {
        for (const [ip, value] of hits) if (value.resetAt <= now) hits.delete(ip);
      }
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (entry.count >= max) {
      return res.status(429).json({ error: "Demasiados intentos, espera unos minutos." });
    }
    entry.count += 1;
    next();
  };
};

module.exports = { createRateLimiter };
