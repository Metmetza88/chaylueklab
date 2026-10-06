/** A LINE channel ID is public configuration, not a credential. */
export function resolveLineLoginChannel(liffId: unknown, override?: string): string | undefined {
  if (typeof liffId !== 'string' || liffId.length > 128) return undefined;
  const channel = /^(\d{1,20})-[A-Za-z0-9]+$/.exec(liffId)?.[1];
  if (!channel) return undefined;
  // An explicit override must match the bundled app. Never trust a browser audience.
  if (override !== undefined && override !== channel) return undefined;
  return channel;
}
