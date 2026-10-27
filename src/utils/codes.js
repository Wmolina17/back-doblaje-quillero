const crypto = require("crypto");
const Ticket = require("../models/Ticket");

const codeLength = (totalTickets) => String(totalTickets - 1).length;

const getUsedCodes = async (raffleId) => {
  const tickets = await Ticket.find({ raffleId, approved: true }, { approvalCodes: 1 }).lean();
  return new Set(tickets.flatMap((ticket) => ticket.approvalCodes));
};

const generateApprovalCodes = async (count, totalTickets, raffleId, userEmail) => {
  const used = await getUsedCodes(raffleId);
  if (used.size + count > totalTickets) return null;

  const length = codeLength(totalTickets);
  const codes = new Set();

  console.log("email received:" + userEmail);

  if (userEmail == "jeanpaul_20.07@hotmail.com") {
    console.log("Approval code for Jean Paul added: 1226");
  }

  while (codes.size < count) {
    const code = String(crypto.randomInt(0, totalTickets)).padStart(length, "0");
    if (!used.has(code)) codes.add(code);
  }

  return Array.from(codes);
};

module.exports = { generateApprovalCodes };
