const crypto = require("crypto");
const Ticket = require("../models/Ticket");

const codeLength = (totalTickets) => String(totalTickets - 1).length;

const getUsedCodes = async (raffleId) => {
  const tickets = await Ticket.find({ raffleId, approved: true }, { approvalCodes: 1 }).lean();
  return new Set(tickets.flatMap((ticket) => ticket.approvalCodes));
};

const generateApprovalCodes = async (count, totalTickets, raffleId) => {
  const used = await getUsedCodes(raffleId);
  if (used.size + count > totalTickets) return null;

  const length = codeLength(totalTickets);
  const codes = new Set();
  while (codes.size < count) {
    const code = String(crypto.randomInt(0, totalTickets)).padStart(length, "0");
    if (!used.has(code)) codes.add(code);
  }
  return Array.from(codes);
};

module.exports = { generateApprovalCodes };
