// src/lib/mockData.ts

export type EquityPoint = { d: string; v: number };

function generateEquitySeries(
  days: number,
  startDate: string,
  startValue = 100
): EquityPoint[] {
  const out: EquityPoint[] = [];

  const start = new Date(startDate);
  let value = startValue;

  for (let i = 0; i < days; i++) {
    const dt = new Date(start);
    dt.setDate(start.getDate() + i);

    // realistic daily movement:
    // small upward drift + randomness
    const dailyMove =
      (Math.random() - 0.48) * 0.9 + Math.sin(i / 18) * 0.25;

    value += dailyMove;

    out.push({
      d: dt.toISOString().slice(0, 10), // YYYY-MM-DD
      v: Number(value.toFixed(2)),
    });
  }

  return out;
}

// ✅ export once, use everywhere
export const EQUITY_SERIES_1Y = generateEquitySeries(
  1000,          // days
  "2023-01-01",  // start date
  100            // base value
);