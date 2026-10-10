const BOGOTA_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 400;

const round1 = (value) => Math.round(value * 10) / 10;
const ratio = (part, whole) => (whole > 0 ? part / whole : 0);

const bogotaDate = (date) => new Date(date.getTime() - BOGOTA_OFFSET_MS).toISOString().slice(0, 10);

const parseDay = (day) => {
  const value = new Date(`${day}T00:00:00.000Z`);
  return Number.isNaN(value.getTime()) ? null : value;
};

const addDays = (day, amount) => new Date(parseDay(day).getTime() + amount * DAY_MS).toISOString().slice(0, 10);

const daysInclusive = (startDay, endDay) => Math.floor((parseDay(endDay) - parseDay(startDay)) / DAY_MS) + 1;

const sumExpenses = (expenses = []) => expenses.reduce((total, item) => total + (Number(item.amount) || 0), 0);

const scenarioFor = ({ ticketPrice, totalTickets, totalExpenses }, percent) => {
  const numbers = Math.round((totalTickets * percent) / 100);
  const revenue = numbers * ticketPrice;
  const result = revenue - totalExpenses;
  return { percent, numbers, revenue, result, margin: round1(ratio(result, revenue) * 100) };
};

const buildPlan = (raffle) => {
  const { ticketPrice, totalTickets, minTickets, campaignDays, goalPercent, expenses } = raffle;
  const totalExpenses = sumExpenses(expenses);
  const goal = scenarioFor({ ticketPrice, totalTickets, totalExpenses }, goalPercent);
  const breakEvenNumbers = ticketPrice > 0 ? Math.ceil(totalExpenses / ticketPrice) : 0;
  const dailyGoalNumbers = Math.ceil(goal.numbers / campaignDays);

  return {
    ticketPrice,
    totalTickets,
    minTickets,
    campaignDays,
    goalPercent,
    goalNumbers: goal.numbers,
    goalRevenue: goal.revenue,
    goalProfit: goal.result,
    goalMargin: goal.margin,
    minPurchaseAmount: minTickets * ticketPrice,
    expenses: expenses.map(({ concept, amount }) => ({ concept, amount })),
    totalExpenses,
    breakEvenNumbers,
    breakEvenPercent: round1(ratio(breakEvenNumbers, totalTickets) * 100),
    dailyGoalNumbers,
    dailyGoalRevenue: dailyGoalNumbers * ticketPrice,
  };
};

const buildScenarios = (raffle) => {
  const base = { ticketPrice: raffle.ticketPrice, totalTickets: raffle.totalTickets, totalExpenses: sumExpenses(raffle.expenses) };
  const percents = [...new Set([50, 60, 70, raffle.goalPercent, 90, 100])].sort((a, b) => a - b);
  return percents.map((percent) => ({ ...scenarioFor(base, percent), isGoal: percent === raffle.goalPercent }));
};

const buyersNeeded = (numbers, perBuyer, days) => {
  const buyers = Math.ceil(numbers / perBuyer);
  return { buyers, perDay: Math.ceil(buyers / days) };
};

const buildBuyerScenarios = (raffle, plan) => {
  const options = [...new Set([raffle.minTickets, 6, 8, 10])].filter((value) => value >= raffle.minTickets);
  return options.map((perBuyer) => ({
    perBuyer,
    goal: buyersNeeded(plan.goalNumbers, perBuyer, raffle.campaignDays),
    full: buyersNeeded(raffle.totalTickets, perBuyer, raffle.campaignDays),
  }));
};

const buildMilestones = (raffle, plan) =>
  [0.25, 0.5, 0.75, 1].map((fraction) => {
    const numbers = Math.round(plan.goalNumbers * fraction);
    return {
      day: Math.round(raffle.campaignDays * fraction),
      numbers,
      buyers: Math.ceil(numbers / raffle.minTickets),
      revenue: numbers * raffle.ticketPrice,
    };
  });

const buildProgress = ({ raffle, plan, totals, startDay, today }) => {
  const elapsedDays = Math.max(1, daysInclusive(startDay, today));
  const daysLeft = Math.max(0, raffle.campaignDays - elapsedDays);
  const revenue = totals.sold * raffle.ticketPrice;
  const avgNumbersPerDay = totals.sold / elapsedDays;
  const projectedNumbers = Math.min(raffle.totalTickets, Math.round(avgNumbersPerDay * raffle.campaignDays));
  const projectedRevenue = projectedNumbers * raffle.ticketPrice;

  return {
    sold: totals.sold,
    pending: totals.pending,
    revenue,
    pendingRevenue: totals.pending * raffle.ticketPrice,
    buyers: totals.buyers,
    orders: totals.orders,
    result: revenue - plan.totalExpenses,
    soldPercent: round1(ratio(totals.sold, raffle.totalTickets) * 100),
    goalProgressPercent: round1(ratio(totals.sold, plan.goalNumbers) * 100),
    breakEvenReached: totals.sold >= plan.breakEvenNumbers,
    numbersToBreakEven: Math.max(0, plan.breakEvenNumbers - totals.sold),
    startDay,
    elapsedDays,
    daysLeft,
    avgNumbersPerDay: round1(avgNumbersPerDay),
    avgRevenuePerDay: Math.round(avgNumbersPerDay * raffle.ticketPrice),
    avgBuyersPerDay: round1(totals.buyers / elapsedDays),
    neededNumbersPerDay: daysLeft > 0 ? Math.ceil(Math.max(0, plan.goalNumbers - totals.sold) / daysLeft) : 0,
    projection: {
      numbers: projectedNumbers,
      revenue: projectedRevenue,
      result: projectedRevenue - plan.totalExpenses,
    },
  };
};

// `rows` son los días con ventas de todo el evento; devuelve la serie continua de startDay a endDay con acumulados globales.
const buildDailySeries = (rows, ticketPrice, startDay, endDay) => {
  const byDay = new Map(rows.map((row) => [row._id, row]));
  let cumulativeNumbers = rows.filter((row) => row._id < startDay).reduce((total, row) => total + row.numbers, 0);

  const days = Math.min(daysInclusive(startDay, endDay), MAX_RANGE_DAYS);
  return Array.from({ length: days }, (_, index) => {
    const date = addDays(startDay, index);
    const row = byDay.get(date);
    const numbers = row?.numbers ?? 0;
    cumulativeNumbers += numbers;
    return {
      date,
      orders: row?.orders ?? 0,
      numbers,
      revenue: numbers * ticketPrice,
      cumulativeNumbers,
      cumulativeRevenue: cumulativeNumbers * ticketPrice,
    };
  });
};

const buildRangeSummary = (rows, daily, startDay, endDay) => {
  const emails = new Set(rows.filter((row) => row._id >= startDay && row._id <= endDay).flatMap((row) => row.emails));
  const numbers = daily.reduce((total, day) => total + day.numbers, 0);
  const revenue = daily.reduce((total, day) => total + day.revenue, 0);
  const orders = daily.reduce((total, day) => total + day.orders, 0);
  const best = daily.reduce((top, day) => (day.numbers > (top?.numbers ?? 0) ? day : top), null);

  return {
    startDate: startDay,
    endDate: endDay,
    days: daily.length,
    orders,
    numbers,
    revenue,
    buyers: emails.size,
    avgNumbersPerDay: round1(ratio(numbers, daily.length)),
    avgRevenuePerDay: Math.round(ratio(revenue, daily.length)),
    avgOrdersPerDay: round1(ratio(orders, daily.length)),
    bestDay: best ? { date: best.date, numbers: best.numbers, revenue: best.revenue } : null,
  };
};

module.exports = {
  bogotaDate,
  parseDay,
  daysInclusive,
  buildPlan,
  buildScenarios,
  buildBuyerScenarios,
  buildMilestones,
  buildProgress,
  buildDailySeries,
  buildRangeSummary,
};
