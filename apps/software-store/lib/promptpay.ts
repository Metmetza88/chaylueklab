const tlv = (tag: string, value: string) =>
  tag + value.length.toString().padStart(2, "0") + value;
export function crc16(s: string): string {
  let crc = 0xffff;
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++)
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}
export function promptPayPayload(target: string, amount?: number) {
  if (!/^(0[0-9]{9}|[0-9]{13})$/.test(target))
    throw new Error("INVALID_PROMPTPAY");
  if (
    amount !== undefined &&
    (!Number.isFinite(amount) ||
      amount <= 0 ||
      amount > 1000000 ||
      Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001)
  )
    throw new Error("INVALID_AMOUNT");
  const account =
    target.length === 13
      ? tlv("02", target)
      : tlv("01", "0066" + target.slice(1));
  const body =
    tlv("00", "01") +
    tlv("01", amount !== undefined ? "12" : "11") +
    tlv("29", tlv("00", "A000000677010111") + account) +
    tlv("53", "764") +
    (amount !== undefined ? tlv("54", amount.toFixed(2)) : "") +
    tlv("58", "TH") +
    "6304";
  return body + crc16(body);
}
