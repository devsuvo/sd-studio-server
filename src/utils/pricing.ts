export const SERVICE_FEE_RATE = 0.05;

const round = (n: number) => Math.round(n * 100) / 100;

/** Same formula the client shows, so guests always see the final price before booking. */
export function quote(hourlyRate: number, cleaningFee: number, hours: number) {
  const subtotal = round(hourlyRate * hours);
  const serviceFee = round(subtotal * SERVICE_FEE_RATE);
  return { hourlyRate, subtotal, cleaningFee, serviceFee, total: round(subtotal + cleaningFee + serviceFee) };
}
