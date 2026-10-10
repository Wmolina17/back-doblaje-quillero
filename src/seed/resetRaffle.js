// Uso: node src/seed/resetRaffle.js [--apply] [--force]
// Sin --apply solo muestra lo que haría. --force permite borrar un evento que ya tenga compras.
const env = require("../config/env");
const connectDB = require("../config/db");
const mongoose = require("mongoose");
const Raffle = require("../models/Raffle");
const Ticket = require("../models/Ticket");
const { generatePrizeNumbers } = require("../utils/prizeNumbers");

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const force = args.has("--force");

const TOTAL_TICKETS = 10000;
const PRIZE_NUMBERS_COUNT = 6;

const NEW_DATA = {
  ticketPrice: 2500,
  minTickets: 5,
  maxTicketsPerPurchase: 200,
  totalTickets: TOTAL_TICKETS,
  prizes: [
    { title: "Premio mayor", amount: "iPhone 18 Pro Max 512 GB" },
    { title: "Número invertido", amount: "iPhone 18 Pro 256 GB" },
    { title: "Números premiados", amount: "6 premios de $500.000" },
  ],
  prizeNumbersCount: PRIZE_NUMBERS_COUNT,
  prizeNumberAmount: "$500.000",
  goalPercent: 85,
  campaignDays: 20,
  expenses: [
    { concept: "iPhone 18 Pro Max 512 GB", amount: 5500000 },
    { concept: "iPhone 18 Pro 256 GB", amount: 4385000 },
    { concept: "6 premios de $500.000", amount: 3000000 },
    { concept: "Página web y software", amount: 1400000 },
    { concept: "4 x 1.000 Nequi (estimación)", amount: 100000 },
  ],
};

const run = async () => {
  await connectDB();
  const active = await Raffle.find({ status: "active" }).lean();
  console.log(`Eventos activos: ${active.length}`);

  const previous = active[0];
  for (const raffle of active) {
    const tickets = await Ticket.countDocuments({ raffleId: raffle._id });
    console.log(`- ${raffle._id} "${raffle.name}" | compras: ${tickets} | imágenes: ${raffle.images?.length ?? 0}`);
    if (tickets > 0 && !force) {
      throw new Error("El evento tiene compras registradas. Usa --force si realmente quieres borrarlas.");
    }
  }

  const newRaffle = {
    name: previous?.name ?? "Rifa Doblaje Quillero",
    description:
      "¡Dos iPhone en juego! El iPhone 18 Pro Max de 512 GB para las cuatro cifras del sorteo y un iPhone 18 Pro de 256 GB para el número invertido (ej: 1234 se invierte a 4321). Además, 6 números premiados de $500.000 cada uno. Compra mínima de 5 números. ¡Eche, no te quedes por fuera, mi llave!",
    drawDate: previous?.drawDate,
    images: previous?.images ?? [],
    visible: previous?.visible ?? true,
    ...NEW_DATA,
    prizeNumbers: generatePrizeNumbers(PRIZE_NUMBERS_COUNT, TOTAL_TICKETS),
  };
  console.log("Nuevo evento:", { ...newRaffle, images: `${newRaffle.images.length} imagen(es)` });

  if (!apply) {
    console.log("Simulación: no se modificó nada. Ejecuta con --apply para aplicar.");
    return;
  }

  const ids = active.map((raffle) => raffle._id);
  const removedTickets = await Ticket.deleteMany({ raffleId: { $in: ids } });
  const removedRaffles = await Raffle.deleteMany({ _id: { $in: ids } });
  const created = await Raffle.create(newRaffle);
  console.log(`Borrados: ${removedRaffles.deletedCount} evento(s), ${removedTickets.deletedCount} compra(s).`);
  console.log(`Creado ${created._id}. Números premiados: ${created.prizeNumbers.join(", ")}`);
};

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
