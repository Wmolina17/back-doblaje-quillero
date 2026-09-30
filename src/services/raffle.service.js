const mongoose = require("mongoose");
const Raffle = require("../models/Raffle");
const Ticket = require("../models/Ticket");
const { HttpError } = require("../utils/http");

const findActiveRaffle = () => Raffle.findOne({ status: "active" });

const getActiveRaffle = async () => {
  const raffle = await findActiveRaffle();
  if (!raffle) throw new HttpError(400, "No hay un evento activo en este momento.");
  return raffle;
};

const resolveRaffleId = async (raffleId) => {
  if (raffleId) {
    if (!mongoose.isValidObjectId(raffleId)) throw new HttpError(400, "Evento inválido");
    return new mongoose.Types.ObjectId(String(raffleId));
  }
  const active = await findActiveRaffle().select("_id").lean();
  return active?._id ?? null;
};

const getTicketStats = async (raffleId) => {
  const [result] = await Ticket.aggregate([
    { $match: { raffleId } },
    {
      $group: {
        _id: null,
        sold: { $sum: { $cond: ["$approved", { $size: "$approvalCodes" }, 0] } },
        pending: { $sum: { $cond: ["$approved", 0, "$numberTickets"] } },
        pendingOrders: { $sum: { $cond: ["$approved", 0, 1] } },
      },
    },
  ]);
  return {
    sold: result?.sold ?? 0,
    pending: result?.pending ?? 0,
    pendingOrders: result?.pendingOrders ?? 0,
  };
};

module.exports = { findActiveRaffle, getActiveRaffle, resolveRaffleId, getTicketStats };
