const { test, after, mock } = require("node:test");
const assert = require("node:assert/strict");

process.env.MONGO_URI = "mongodb://127.0.0.1:27017/campaign-test";
process.env.ADMIN_USER = "test";
process.env.ADMIN_SECRET = "test-only";

const { approvedTicketTemplate } = require("../src/services/email.templates");
const raffleService = require("../src/services/raffle.service");
const Ticket = require("../src/models/Ticket");
const Raffle = require("../src/models/Raffle");
const PaymentMethod = require("../src/models/PaymentMethod");
const Settings = require("../src/models/Settings");

const raffle = {
  _id: "000000000000000000000001",
  name: "Campaña de prueba",
  ticketPrice: 2500,
  minTickets: 5,
  maxTicketsPerPurchase: 200,
  totalTickets: 10000,
  prizeNumbers: ["7156", "0007"],
  prizeNumberAmount: "$500.000",
  visible: true,
  expenses: [{ concept: "Privado", amount: 100 }],
};
const settings = { siteName: "Doblaje Quillero", socials: {} };
const ticket = {
  fullName: "Persona de prueba",
  approvalCodes: ["3842", "7156", "0007"],
  paymentMethod: "Nequi",
  amountPaid: 15000,
  currency: "COP",
  reference: "TEST-001",
};

let activeRaffle = raffle;
mock.method(raffleService, "findActiveRaffle", () => ({
  select: () => ({ lean: async () => activeRaffle }),
}));
mock.method(raffleService, "getActiveRaffle", async () => activeRaffle);
mock.method(raffleService, "getTicketStats", async () => ({ sold: 0, pending: 0 }));

const raffleController = require("../src/controllers/raffle.controller");
const ticketController = require("../src/controllers/ticket.controller");

after(() => mock.restoreAll());

test("winning email codes are green and explicitly labeled; normal codes remain gold", () => {
  const html = approvedTicketTemplate({ settings, ticket, raffle });
  assert.match(html, /color:#F5D77A;[^>]*>3842<\/span>/);
  for (const code of ["7156", "0007"]) {
    assert.match(html, new RegExp(`color:#86EFAC;[^>]*>${code}<span[^>]*>PREMIADO`));
  }
  assert.match(html, /por cada número verde/);
  assert.match(html, /Tu número verde sigue participando por los iPhone/);
  assert.match(html, /No tienes que esperar al sorteo de la Lotería de Medellín/);
});

test("non-winning emails contain no winner notice or green code", () => {
  const html = approvedTicketTemplate({ settings, ticket: { ...ticket, approvalCodes: ["3842"] }, raffle });
  assert.doesNotMatch(html, /¡HAS SIDO GANADOR!/);
  assert.doesNotMatch(html, /background:#10291B/);
});

test("resent emails retain green winning codes and escape user content", () => {
  const html = approvedTicketTemplate({
    settings,
    ticket: { ...ticket, fullName: "<script>alert(1)</script>" },
    raffle,
    resend: true,
  });
  assert.match(html, /Aquí están de nuevo tus seriales/);
  assert.match(html, /color:#86EFAC;[^>]*>7156/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test("campaigns without instant prizes render ordinary codes safely", () => {
  const html = approvedTicketTemplate({ settings, ticket, raffle: { ...raffle, prizeNumbers: undefined } });
  assert.doesNotMatch(html, /¡HAS SIDO GANADOR!/);
  assert.doesNotMatch(html, /background:#10291B/);
});

test("public raffle exposes the real number count and a minimum of six without private expenses", async (t) => {
  activeRaffle = raffle;
  t.mock.method(Ticket, "distinct", async () => ["7156"]);
  let result;
  await raffleController.getCurrent({}, { json: (body) => { result = body; } });
  assert.equal(result.raffle.minTickets, 6);
  assert.equal(result.raffle.totalTickets, 10000);
  assert.equal(result.raffle.expenses, undefined);
  assert.deepEqual(result.drawnPrizeNumbers, ["7156"]);
});

test("no active raffle keeps the empty public response", async () => {
  activeRaffle = null;
  let result;
  await raffleController.getCurrent({}, { json: (body) => { result = body; } });
  assert.deepEqual(result, { raffle: null, stats: null, drawnPrizeNumbers: [] });
  activeRaffle = raffle;
});

const purchase = (numberTickets) => ({
  body: {
    numberTickets,
    fullName: "Persona de prueba",
    email: "test@example.com",
    phone: "+573001234567",
    reference: "TEST-001",
    paymentMethodId: "000000000000000000000002",
    voucher: "data:image/png;base64,aGVsbG8=",
  },
});

test("purchase rejects five numbers even for an older raffle configured with five", async () => {
  activeRaffle = raffle;
  await assert.rejects(ticketController.create(purchase(5), {}), (error) =>
    error.status === 400 && /entre 6 y 200/.test(error.message));
});

test("purchase of six numbers costs 15000 COP", async (t) => {
  activeRaffle = raffle;
  t.mock.method(PaymentMethod, "findById", async () => ({
    _id: "000000000000000000000002", name: "Nequi", active: true, currency: "COP", provider: "nequi",
  }));
  t.mock.method(Settings, "getSingleton", async () => ({ usdRate: 4000 }));
  const create = t.mock.method(Ticket, "create", async (data) => ({ ...data, _id: "test-purchase" }));
  let result;
  const response = {
    status(code) { assert.equal(code, 201); return this; },
    json(body) { result = body; },
  };
  await ticketController.create(purchase(6), response);
  assert.equal(result.ticket.numberTickets, 6);
  assert.equal(result.ticket.amountPaid, 15000);
  assert.equal(create.mock.callCount(), 1);
});

test("a configured higher minimum is still respected", async () => {
  activeRaffle = { ...raffle, minTickets: 10 };
  assert.equal(raffleService.getMinimumTickets(activeRaffle), 10);
  await assert.rejects(ticketController.create(purchase(6), {}), (error) =>
    error.status === 400 && /entre 10 y 200/.test(error.message));
  activeRaffle = raffle;
});

test("admin creation cannot configure a minimum below six", async (t) => {
  t.mock.method(Raffle, "exists", async () => false);
  await assert.rejects(raffleController.create({ body: { name: "Test", ticketPrice: 2500, minTickets: 5 } }, {}), (error) =>
    error.status === 400 && /al menos 6/.test(error.message));
});
