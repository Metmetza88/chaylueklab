export const configured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
export function paymentMode(): "disabled" | "sandbox" | "live" {
  if (process.env.APP_VARIANT === "school") return "disabled";
  const mode = process.env.PAYMENT_MODE;
  if (mode === "sandbox") return "sandbox";
  if (mode === "live" && process.env.LIVE_PAYMENTS_APPROVED === "true")
    return "live";
  return "disabled";
}
