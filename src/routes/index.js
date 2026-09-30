const { Router } = require("express");
const { asyncHandler: h } = require("../utils/http");
const { requireAdmin, requireClient } = require("../middlewares/auth");
const { createRateLimiter } = require("../middlewares/rateLimit");
const auth = require("../controllers/auth.controller");
const raffle = require("../controllers/raffle.controller");
const tickets = require("../controllers/ticket.controller");
const paymentMethods = require("../controllers/paymentMethod.controller");
const settings = require("../controllers/settings.controller");

const router = Router();
const loginLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10 });
const publicWriteLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 20 });
const adminLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 300 });
const clientTokenLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 30 });
const publicReadLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 120 });

router.get("/time", auth.serverTime);
router.get("/client-token", clientTokenLimiter, auth.clientToken);
router.post("/admin/auth", loginLimiter, requireClient, auth.login);

router.get("/settings", publicReadLimiter, requireClient, h(settings.get));
router.get("/raffle", publicReadLimiter, requireClient, h(raffle.getCurrent));
router.get("/payment-methods", publicReadLimiter, requireClient, h(paymentMethods.listActive));
router.post("/tickets", publicWriteLimiter, requireClient, h(tickets.create));
router.post("/tickets/lookup", publicWriteLimiter, requireClient, h(tickets.lookupByEmail));

router.use(adminLimiter, requireAdmin);

router.put("/settings", h(settings.update));

router.get("/raffle/full", h(raffle.getFull));
router.get("/raffle/stats", h(raffle.getAdminStats));
router.post("/raffle", h(raffle.create));
router.put("/raffle", h(raffle.update));
router.post("/raffle/finish", h(raffle.finish));
router.post("/raffle/toggle-visibility", h(raffle.toggleVisibility));
router.get("/raffles/history", h(raffle.history));
router.post("/raffles/:id/resume", h(raffle.resume));

router.get("/payment-methods/all", h(paymentMethods.listAll));
router.post("/payment-methods", h(paymentMethods.create));
router.put("/payment-methods/:id", h(paymentMethods.update));
router.delete("/payment-methods/:id", h(paymentMethods.remove));

router.get("/tickets", h(tickets.list));
router.get("/tickets/top-buyers", h(tickets.topBuyers));
router.get("/tickets/summary", h(tickets.summary));
router.get("/tickets/number/:code", h(tickets.findByNumber));
router.get("/tickets/:id/voucher", h(tickets.getVoucher));
router.put("/tickets/:id", h(tickets.update));
router.post("/tickets/:id/approve", h(tickets.approve));
router.post("/tickets/:id/resend", h(tickets.resend));
router.delete("/tickets/:id", h(tickets.reject));

module.exports = router;
