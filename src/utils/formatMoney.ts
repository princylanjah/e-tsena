export function formatMoney(amount: number | null | undefined): string {
  if (amount == null || isNaN(Number(amount))) return '0';
  const value = Number(amount);
  const abs = Math.abs(value);

  // Only use suffix when the value is an exact multiple of the unit
  const isDivisibleBy = (n: number) => Math.floor(abs) % n === 0;

  // We'll keep compact formatting only for exact multiples (e.g., 1000 -> 1K, 15000 -> 15K)
  if (isDivisibleBy(1_000_000_000) && abs >= 1_000_000_000) {
    return `${value / 1_000_000_000}Mrd`;
  }
  if (isDivisibleBy(1_000_000) && abs >= 1_000_000) {
    return `${value / 1_000_000}M`;
  }
  if (isDivisibleBy(1_000) && abs >= 1_000) {
    return `${value / 1_000}K`;
  }

  // For smaller numbers keep default locale formatting, avoid unnecessary decimals
  return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default formatMoney;
