const Ticket = require("../models/Ticket");
const { HttpError } = require("../utils/http");
const { findActiveRaffle, getTicketStats } = require("../services/raffle.service");
const {
  bogotaDate,
  parseDay,
  buildPlan,
  buildScenarios,
  buildBuyerScenarios,
  buildMilestones,
  buildProgress,
  buildDailySeries,
  buildRangeSummary,
} = require("../utils/finance");

const DAY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const resolveRange = (query, startDay, today) => {
  const startDate = query.startDate ? String(query.startDate) : startDay;
  const endDate = query.endDate ? String(query.endDate) : today;
  const valid = [startDate, endDate].every((day) => DAY_REGEX.test(day) && parseDay(day));
  if (!valid || startDate > endDate) throw new HttpError(400, "Rango de fechas inválido");
  return { startDate, endDate };
};

const dailySales = (raffleId) =>
  Ticket.aggregate([
    { $match: { raffleId, approved: true } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "America/Bogota" } },
        orders: { $sum: 1 },
        numbers: { $sum: "$numberTickets" },
        emails: { $addToSet: "$email" },
      },
    },
  ]);

const prizeNumberHolders = async (raffle) => {
  if (!raffle.prizeNumbers?.length) return [];
  const tickets = await Ticket.find(
    { raffleId: raffle._id, approved: true, approvalCodes: { $in: raffle.prizeNumbers } },
    { fullName: 1, email: 1, phone: 1, approvalCodes: 1 },
  ).lean();
  return raffle.prizeNumbers.map((code) => {
    const ticket = tickets.find((item) => item.approvalCodes.includes(code));
    return {
      code,
      holder: ticket ? { fullName: ticket.fullName, email: ticket.email, phone: ticket.phone } : null,
    };
  });
};

const getFinance = async (req, res) => {
  const found = await findActiveRaffle().lean();
  if (!found) return res.json(null);
  const raffle = { ...found, expenses: found.expenses ?? [], goalPercent: found.goalPercent ?? 85, campaignDays: found.campaignDays ?? 20 };

  const today = bogotaDate(new Date());
  const startDay = bogotaDate(raffle.createdAt);
  const { startDate, endDate } = resolveRange(req.query, startDay, today);

  const [rows, stats, holders] = await Promise.all([
    dailySales(raffle._id),
    getTicketStats(raffle._id),
    prizeNumberHolders(raffle),
  ]);

  const plan = buildPlan(raffle);
  const daily = buildDailySeries(rows, raffle.ticketPrice, startDate, endDate);
  const allEmails = new Set(rows.flatMap((row) => row.emails));
  const totals = {
    sold: rows.reduce((total, row) => total + row.numbers, 0),
    orders: rows.reduce((total, row) => total + row.orders, 0),
    buyers: allEmails.size,
    pending: stats.pending,
  };

  res.json({
    plan,
    scenarios: buildScenarios(raffle),
    buyerScenarios: buildBuyerScenarios(raffle, plan),
    milestones: buildMilestones(raffle, plan),
    progress: buildProgress({ raffle, plan, totals, startDay, today }),
    range: buildRangeSummary(rows, daily, startDate, endDate),
    daily,
    prizeNumbers: holders,
  });
};

module.exports = { getFinance };
