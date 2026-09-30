const Raffle = require("../models/Raffle");
const Ticket = require("../models/Ticket");

const migrateRaffleHistory = async () => {
  await Raffle.updateMany({ status: { $exists: false } }, { $set: { status: "active" } });

  const active = await Raffle.findOne({ status: "active" }).select("_id").lean();
  if (!active) return;

  const { modifiedCount } = await Ticket.updateMany(
    { raffleId: { $exists: false } },
    { $set: { raffleId: active._id } },
  );
  if (modifiedCount) console.log(`Migración: ${modifiedCount} compras asociadas al evento activo`);
};

module.exports = { migrateRaffleHistory };
