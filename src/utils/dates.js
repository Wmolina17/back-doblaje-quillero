const BOGOTA_OFFSET_MS = 5 * 60 * 60 * 1000;

const bogotaDayRange = (startDate, endDate) => {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T23:59:59.999Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return {
    $gte: new Date(start.getTime() + BOGOTA_OFFSET_MS),
    $lte: new Date(end.getTime() + BOGOTA_OFFSET_MS),
  };
};

module.exports = { bogotaDayRange };
