const Raffle = require("../models/Raffle");
const Ticket = require("../models/Ticket");
const { HttpError } = require("../utils/http");
const { IMAGE_LIMITS, isValidImage, isHttpUrl } = require("../utils/validation");
const { getTicketStats, findActiveRaffle } = require("../services/raffle.service");

const parseRaffleInput = (body, { partial }) => {
  const data = {};
  const has = (key) => body[key] !== undefined;

  if (has("name")) data.name = String(body.name).trim();
  if (has("description")) data.description = String(body.description).trim();
  if (has("drawDate")) data.drawDate = body.drawDate ? new Date(body.drawDate) : null;
  if (has("visible")) data.visible = Boolean(body.visible);

  for (const key of ["ticketPrice", "minTickets", "maxTicketsPerPurchase", "totalTickets"]) {
    if (!has(key)) continue;
    const value = Number(body[key]);
    if (!Number.isFinite(value) || value < 0) throw new HttpError(400, `Valor inválido para ${key}`);
    data[key] = key === "ticketPrice" ? value : Math.floor(value);
  }

  if (has("images")) {
    const valid =
      Array.isArray(body.images) &&
      body.images.length <= IMAGE_LIMITS.raffleImages &&
      body.images.every((img) => isValidImage(img, IMAGE_LIMITS.raffleImageBytes) || isHttpUrl(img));
    if (!valid) {
      throw new HttpError(
        400,
        `Máximo ${IMAGE_LIMITS.raffleImages} imágenes de hasta ${IMAGE_LIMITS.raffleImageBytes / 1024} KB cada una.`,
      );
    }
    data.images = body.images;
  }

  if (has("prizes")) {
    data.prizes = Array.isArray(body.prizes)
      ? body.prizes
          .filter((prize) => prize && (prize.title || prize.amount))
          .map((prize) => ({ title: String(prize.title || ""), amount: String(prize.amount || "") }))
      : [];
  }

  if (!partial && (!data.name || data.ticketPrice === undefined)) {
    throw new HttpError(400, "El nombre y el precio del boleto son obligatorios.");
  }
  if (data.drawDate && Number.isNaN(data.drawDate.getTime())) {
    throw new HttpError(400, "Fecha del evento inválida.");
  }
  return data;
};

const requireActiveRaffle = async () => {
  const raffle = await findActiveRaffle();
  if (!raffle) throw new HttpError(404, "No hay un evento activo.");
  return raffle;
};

const getCurrent = async (req, res) => {
  const raffle = await findActiveRaffle().lean();
  if (!raffle) return res.json({ raffle: null, stats: null });

  const stats = await getTicketStats(raffle._id);
  const { totalTickets, ...publicRaffle } = raffle;
  const available = raffle.visible ? Math.max(0, totalTickets - stats.sold - stats.pending) : 0;
  res.json({
    raffle: publicRaffle,
    stats: {
      availablePercent: Math.max(0, Math.round((available / totalTickets) * 1000) / 10),
      maxPurchasable: Math.min(raffle.maxTicketsPerPurchase, available),
    },
  });
};

const getFull = async (req, res) => {
  res.json(await findActiveRaffle().lean());
};

const getAdminStats = async (req, res) => {
  const raffle = await findActiveRaffle().lean();
  if (!raffle) return res.json({ sold: 0, pending: 0, pendingOrders: 0, totalTickets: 0 });
  const stats = await getTicketStats(raffle._id);
  res.json({ ...stats, totalTickets: raffle.totalTickets });
};

const create = async (req, res) => {
  if (await Raffle.exists({ status: "active" })) {
    throw new HttpError(400, "Ya existe un evento activo. Finalízalo antes de crear otro.");
  }
  const raffle = await Raffle.create(parseRaffleInput(req.body, { partial: false }));
  res.status(201).json({ message: "Evento creado exitosamente", raffle });
};

const update = async (req, res) => {
  const raffle = await requireActiveRaffle();
  raffle.set(parseRaffleInput(req.body, { partial: true }));
  await raffle.save();
  res.json({ message: "Evento actualizado exitosamente", raffle });
};

const finish = async (req, res) => {
  const raffle = await requireActiveRaffle();
  raffle.status = "finished";
  raffle.finishedAt = new Date();
  await raffle.save();
  res.json({ message: "Evento finalizado. Sus datos quedan en el historial." });
};

const resume = async (req, res) => {
  if (await Raffle.exists({ status: "active" })) {
    throw new HttpError(400, "Ya hay un evento activo. Finalízalo antes de reanudar otro.");
  }
  const raffle = await Raffle.findOne({ _id: req.params.id, status: "finished" });
  if (!raffle) throw new HttpError(404, "Evento no encontrado en el historial.");
  raffle.status = "active";
  raffle.finishedAt = undefined;
  await raffle.save();
  res.json({ message: "Evento reanudado", raffle });
};

const history = async (req, res) => {
  const raffles = await Raffle.find({ status: "finished" }, { images: { $slice: 1 } })
    .sort({ finishedAt: -1 })
    .lean();

  const stats = await Ticket.aggregate([
    { $match: { raffleId: { $in: raffles.map((raffle) => raffle._id) } } },
    {
      $group: {
        _id: { raffleId: "$raffleId", currency: "$currency" },
        orders: { $sum: 1 },
        emails: { $addToSet: "$email" },
        sold: { $sum: { $cond: ["$approved", { $size: "$approvalCodes" }, 0] } },
        pending: { $sum: { $cond: ["$approved", 0, "$numberTickets"] } },
        total: { $sum: { $cond: ["$approved", "$amountPaid", 0] } },
      },
    },
  ]);

  const byRaffle = new Map();
  for (const row of stats) {
    const key = String(row._id.raffleId);
    const entry = byRaffle.get(key) ?? { orders: 0, emails: new Set(), sold: 0, pending: 0, totals: [] };
    entry.orders += row.orders;
    entry.sold += row.sold;
    entry.pending += row.pending;
    row.emails.forEach((email) => entry.emails.add(email));
    if (row.total > 0) entry.totals.push({ currency: row._id.currency, total: row.total });
    byRaffle.set(key, entry);
  }

  res.json(
    raffles.map((raffle) => {
      const entry = byRaffle.get(String(raffle._id));
      return {
        ...raffle,
        stats: {
          orders: entry?.orders ?? 0,
          buyers: entry?.emails.size ?? 0,
          sold: entry?.sold ?? 0,
          pending: entry?.pending ?? 0,
          totals: entry?.totals ?? [],
        },
      };
    }),
  );
};

const toggleVisibility = async (req, res) => {
  const raffle = await requireActiveRaffle();
  raffle.visible = !raffle.visible;
  await raffle.save();
  res.json({ message: "Estado actualizado", visible: raffle.visible });
};

module.exports = {
  getCurrent,
  getFull,
  getAdminStats,
  create,
  update,
  finish,
  resume,
  history,
  toggleVisibility,
};
