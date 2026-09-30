const Ticket = require("../models/Ticket");
const Raffle = require("../models/Raffle");
const PaymentMethod = require("../models/PaymentMethod");
const Settings = require("../models/Settings");
const { HttpError } = require("../utils/http");
const { calculateAmount } = require("../utils/pricing");
const { generateApprovalCodes } = require("../utils/codes");
const { bogotaDayRange } = require("../utils/dates");
const {
  escapeRegex,
  EMAIL_REGEX,
  PHONE_REGEX,
  IMAGE_LIMITS,
  isValidImage,
} = require("../utils/validation");
const { getActiveRaffle, getTicketStats, resolveRaffleId, findActiveRaffle } = require("../services/raffle.service");
const { sendApprovedTicketEmail } = require("../services/email.service");

const MAX_PAGE_SIZE = 200;

const findTicket = async (id) => {
  const ticket = await Ticket.findById(id);
  if (!ticket) throw new HttpError(404, "Ticket no encontrado");
  return ticket;
};

const findPaymentMethod = async (id, { onlyActive }) => {
  const method = await PaymentMethod.findById(id);
  if (!method || (onlyActive && !method.active)) {
    throw new HttpError(400, "Método de pago inválido");
  }
  return method;
};

const findTicketRaffle = async (ticket) => {
  const raffle = await Raffle.findById(ticket.raffleId);
  if (!raffle) throw new HttpError(404, "El evento de esta compra no existe.");
  return raffle;
};

const create = async (req, res) => {
  const { numberTickets, fullName, email, phone, reference, paymentMethodId, voucher } = req.body;
  const quantity = Number(numberTickets);

  if (!String(fullName || "").trim() || !String(reference || "").trim()) {
    throw new HttpError(400, "Nombre y referencia son obligatorios.");
  }
  if (!EMAIL_REGEX.test(email || "")) throw new HttpError(400, "Correo inválido");
  if (!PHONE_REGEX.test(phone || "")) throw new HttpError(400, "Número telefónico inválido");
  if (!isValidImage(voucher, IMAGE_LIMITS.voucherBytes)) {
    throw new HttpError(400, "Adjunta un comprobante de pago válido (máx. 400 KB).");
  }

  const raffle = await getActiveRaffle();
  if (!raffle.visible) throw new HttpError(400, "El evento no está disponible en este momento.");

  if (!Number.isInteger(quantity) || quantity < raffle.minTickets || quantity > raffle.maxTicketsPerPurchase) {
    throw new HttpError(
      400,
      `Debes comprar entre ${raffle.minTickets} y ${raffle.maxTicketsPerPurchase} boletos.`,
    );
  }

  const stats = await getTicketStats(raffle._id);
  const available = raffle.totalTickets - stats.sold - stats.pending;
  if (quantity > available) {
    throw new HttpError(400, "No hay suficientes boletos disponibles para esa cantidad. Intenta con menos.");
  }

  const [method, settings] = await Promise.all([
    findPaymentMethod(paymentMethodId, { onlyActive: true }),
    Settings.getSingleton(),
  ]);

  const ticket = await Ticket.create({
    raffleId: raffle._id,
    numberTickets: quantity,
    fullName,
    email,
    phone,
    reference,
    paymentMethodId: method._id,
    paymentMethod: method.name,
    currency: method.currency,
    amountPaid: calculateAmount({
      ticketPrice: raffle.ticketPrice,
      quantity,
      currency: method.currency,
      usdRate: settings.usdRate,
    }),
    voucher,
  });

  res.status(201).json({
    message: "Compra registrada exitosamente",
    ticket: {
      _id: ticket._id,
      numberTickets: ticket.numberTickets,
      paymentMethod: ticket.paymentMethod,
      currency: ticket.currency,
      amountPaid: ticket.amountPaid,
    },
  });
};

const lookupByEmail = async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) throw new HttpError(400, "Correo inválido");

  const raffle = await findActiveRaffle().select("_id").lean();
  const tickets = raffle ? await Ticket.find({ email, raffleId: raffle._id }, { voucher: 0 }).lean() : [];
  if (!tickets.length) {
    throw new HttpError(404, "No encontramos compras registradas con este correo.");
  }

  const approved = tickets.filter((ticket) => ticket.approved);
  res.json({
    fullName: tickets[0].fullName,
    email,
    codes: approved.flatMap((ticket) => ticket.approvalCodes),
    pendingOrders: tickets.length - approved.length,
  });
};

const list = async (req, res) => {
  const { status, paymentMethod, q, order = "desc" } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.limit, 10) || 50));

  const raffleId = await resolveRaffleId(req.query.raffleId);
  if (!raffleId) return res.json({ items: [], total: 0, page: 1, pages: 1 });

  const filter = { raffleId };
  if (status === "pending") filter.approved = false;
  if (status === "approved") filter.approved = true;
  if (paymentMethod) filter.paymentMethod = String(paymentMethod);
  if (q) {
    const pattern = new RegExp(escapeRegex(String(q).trim()), "i");
    filter.$or = [{ fullName: pattern }, { email: pattern }, { reference: pattern }, { approvalCodes: String(q).trim() }];
  }

  const [items, total] = await Promise.all([
    Ticket.find(filter, { voucher: 0 })
      .sort({ _id: order === "asc" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Ticket.countDocuments(filter),
  ]);

  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
};

const getVoucher = async (req, res) => {
  const ticket = await Ticket.findById(req.params.id, { voucher: 1 }).lean();
  if (!ticket) throw new HttpError(404, "Ticket no encontrado");
  res.json({ voucher: ticket.voucher });
};

const findByNumber = async (req, res) => {
  const raffleId = await resolveRaffleId(req.query.raffleId);
  const ticket = raffleId
    ? await Ticket.findOne({ raffleId, approvalCodes: String(req.params.code) }, { voucher: 0 }).lean()
    : null;
  res.json({ sold: Boolean(ticket), ticket });
};

const approve = async (req, res) => {
  const ticket = await findTicket(req.params.id);
  if (ticket.approved) throw new HttpError(400, "Este ticket ya fue aprobado.");

  const raffle = await findTicketRaffle(ticket);
  if (raffle.status !== "active") throw new HttpError(400, "El evento de esta compra ya finalizó.");
  const codes = await generateApprovalCodes(ticket.numberTickets, raffle.totalTickets, raffle._id);
  if (!codes) throw new HttpError(400, "No quedan números disponibles");

  ticket.approved = true;
  ticket.approvalCodes = codes;
  await ticket.save();

  let emailSent = false;
  try {
    emailSent = await sendApprovedTicketEmail({ ticket, raffle });
  } catch (error) {
    console.error("Error enviando correo de aprobación:", error);
  }

  res.json({ message: "Ticket aprobado", approvalCodes: codes, emailSent });
};

const reject = async (req, res) => {
  const ticket = await findTicket(req.params.id);
  await ticket.deleteOne();
  res.json({ message: "Ticket eliminado" });
};

const resend = async (req, res) => {
  const ticket = await findTicket(req.params.id);
  if (!ticket.approved) throw new HttpError(400, "El ticket aún no ha sido aprobado.");
  const raffle = await findTicketRaffle(ticket);
  const sent = await sendApprovedTicketEmail({ ticket, raffle, resend: true });
  if (!sent) throw new HttpError(503, "El servicio de correo no está configurado.");
  res.json({ message: "Correo reenviado exitosamente" });
};

const update = async (req, res) => {
  const { email, phone, numberTickets, paymentMethodId } = req.body;
  const ticket = await findTicket(req.params.id);

  if (email !== undefined) {
    if (!EMAIL_REGEX.test(email)) throw new HttpError(400, "Correo inválido");
    ticket.email = email;
  }
  if (phone !== undefined) {
    if (!PHONE_REGEX.test(phone)) throw new HttpError(400, "Número telefónico inválido");
    ticket.phone = phone;
  }

  let recalculate = false;
  if (numberTickets !== undefined && Number(numberTickets) !== ticket.numberTickets) {
    const quantity = Number(numberTickets);
    if (ticket.approved) throw new HttpError(400, "No puedes cambiar la cantidad de un ticket aprobado.");
    if (!Number.isInteger(quantity) || quantity < 1) throw new HttpError(400, "Cantidad inválida");
    ticket.numberTickets = quantity;
    recalculate = true;
  }
  if (paymentMethodId && String(paymentMethodId) !== String(ticket.paymentMethodId)) {
    const method = await findPaymentMethod(paymentMethodId, { onlyActive: false });
    ticket.paymentMethodId = method._id;
    ticket.paymentMethod = method.name;
    ticket.currency = method.currency;
    recalculate = true;
  }

  if (recalculate) {
    const [raffle, settings] = await Promise.all([findTicketRaffle(ticket), Settings.getSingleton()]);
    ticket.amountPaid = calculateAmount({
      ticketPrice: raffle.ticketPrice,
      quantity: ticket.numberTickets,
      currency: ticket.currency,
      usdRate: settings.usdRate,
    });
  }

  await ticket.save();
  const { voucher, ...data } = ticket.toObject();
  res.json({ message: "Datos actualizados correctamente", ticket: data });
};

const topBuyers = async (req, res) => {
  const raffleId = await resolveRaffleId(req.query.raffleId);
  if (!raffleId) return res.json([]);
  const match = { raffleId, approved: true };
  const { startDate, endDate } = req.query;
  if (startDate && endDate) {
    const range = bogotaDayRange(String(startDate), String(endDate));
    if (!range) throw new HttpError(400, "Fechas inválidas");
    match.createdAt = range;
  }

  const buyers = await Ticket.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$email",
        fullName: { $first: "$fullName" },
        phone: { $first: "$phone" },
        totalTickets: { $sum: "$numberTickets" },
        purchases: { $sum: 1 },
      },
    },
    { $sort: { totalTickets: -1 } },
    { $limit: 10 },
  ]);
  res.json(buyers);
};

const summary = async (req, res) => {
  const raffleId = await resolveRaffleId(req.query.raffleId);
  if (!raffleId) return res.json([]);
  const data = await Ticket.aggregate([
    { $match: { raffleId, approved: true } },
    {
      $group: {
        _id: { paymentMethod: "$paymentMethod", currency: "$currency" },
        total: { $sum: "$amountPaid" },
        tickets: { $sum: "$numberTickets" },
      },
    },
    {
      $project: {
        _id: 0,
        paymentMethod: "$_id.paymentMethod",
        currency: "$_id.currency",
        total: 1,
        tickets: 1,
      },
    },
    { $sort: { total: -1 } },
  ]);
  res.json(data);
};

module.exports = {
  create,
  lookupByEmail,
  list,
  getVoucher,
  findByNumber,
  approve,
  reject,
  resend,
  update,
  topBuyers,
  summary,
};
