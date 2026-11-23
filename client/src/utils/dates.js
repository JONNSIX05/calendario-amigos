const MONTH_NAMES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const WEEKDAY_SHORT_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const WEEKDAY_LONG_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export { WEEKDAY_SHORT_ES };

export function getCurrentMonthStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function getTodayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

export function shiftMonth(monthStr, delta) {
  const [y, m] = monthStr.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonthTitle(monthStr) {
  const [y, m] = monthStr.split('-').map(Number);
  return `${MONTH_NAMES_ES[m - 1]} ${y}`;
}

export function formatFullDateEs(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const weekday = WEEKDAY_LONG_ES[dt.getDay()];
  return `${weekday}, ${d} de ${MONTH_NAMES_ES[m - 1].toLowerCase()}`;
}

export function formatShortDateEs(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const weekday = WEEKDAY_LONG_ES[dt.getDay()].slice(0, 3);
  return `${weekday} ${d} ${MONTH_NAMES_ES[m - 1].slice(0, 3)}`;
}

/**
 * Builds Monday-first calendar grid cells for YYYY-MM.
 */
export function buildMonthGrid(monthStr) {
  const [year, month] = monthStr.split('-').map(Number);
  const firstOfMonth = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();

  // Convert JS Sunday=0..Saturday=6 into Monday=0..Sunday=6
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const cells = [];

  for (let i = 0; i < startOffset; i += 1) {
    cells.push({ type: 'empty', key: `pre-${i}` });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({ type: 'day', day, date: dateStr, key: dateStr });
  }

  const remainder = cells.length % 7;
  if (remainder !== 0) {
    for (let i = 0; i < 7 - remainder; i += 1) {
      cells.push({ type: 'empty', key: `post-${i}` });
    }
  }

  return cells;
}

/**
 * Ranks days in the active month:
 * 1. Days where ALL active users are "available" come FIRST
 * 2. Higher available count
 * 3. Higher maybe count
 * 4. Earlier date
 */
export function rankBestDays(entriesByDate, totalUsersCount) {
  const days = [];

  for (const [date, items] of Object.entries(entriesByDate)) {
    if (!items || items.length === 0) continue;
    const available = items.filter((e) => e.status === 'available');
    const maybe = items.filter((e) => e.status === 'maybe');
    const allCanAttend = totalUsersCount >= 2 && available.length === totalUsersCount;

    days.push({
      date,
      available,
      maybe,
      allCanAttend,
      totalResponded: items.length,
    });
  }

  days.sort((a, b) => {
    if (a.allCanAttend !== b.allCanAttend) return a.allCanAttend ? -1 : 1;
    if (b.available.length !== a.available.length) return b.available.length - a.available.length;
    if (b.maybe.length !== a.maybe.length) return b.maybe.length - a.maybe.length;
    return a.date.localeCompare(b.date);
  });

  return days;
}
