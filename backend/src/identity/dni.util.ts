// Peru DNI helpers.
//
// IMPORTANT: RENIEC's real verification-digit algorithm is not public. The function
// below is a DETERMINISTIC MOCK so the MVP can validate a check digit offline and
// behave consistently in demos. In production this step is replaced by a real
// RENIEC / PIDE lookup (see docs/PLAN.md section 6.2). Do not present this as the
// official algorithm.

export function isValidDniFormat(dni: string): boolean {
  return /^\d{8}$/.test(dni);
}

// Weighted mod-11 over the 8 digits -> single digit 0-9 (10 maps to 0).
export function computeMockCheckDigit(dni: string): number {
  const weights = [3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += Number(dni[i]) * weights[i];
  }
  const mod = 11 - (sum % 11);
  if (mod === 11) return 0;
  if (mod === 10) return 0;
  return mod;
}

export function isValidCheckDigit(dni: string, checkDigit: number | string): boolean {
  if (!isValidDniFormat(dni)) return false;
  return computeMockCheckDigit(dni) === Number(checkDigit);
}

// Plausibility check for the DNI issue date (between 1990 and today).
export function isPlausibleIssueDate(iso: string): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const min = new Date('1990-01-01').getTime();
  return d.getTime() >= min && d.getTime() <= Date.now();
}
