export type StockLineProfile = { line_user_id: string; display_name: string };

/** Verify both credentials against the trusted Login audience, then fetch the
 * actual LINE profile. Browser-supplied names/user IDs never establish identity. */
export async function verifyStockLineProfile(idToken: string, accessToken: string, channel: string, fetcher: typeof fetch = fetch): Promise<StockLineProfile | null> {
  const [identityResponse, accessResponse] = await Promise.all([
    fetcher('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: idToken, client_id: channel }), signal: AbortSignal.timeout(8000),
    }),
    fetcher('https://api.line.me/oauth2/v2.1/verify?' + new URLSearchParams({ access_token: accessToken }), { signal: AbortSignal.timeout(8000) }),
  ]);
  if (!identityResponse.ok || !accessResponse.ok) {
    if (identityResponse.status >= 500 || accessResponse.status >= 500) throw new Error('line_verification_unavailable');
    return null;
  }
  const [identity, access] = await Promise.all([identityResponse.json(), accessResponse.json()]);
  if (typeof identity?.sub !== 'string' || !/^U[a-f0-9]{32}$/.test(identity.sub)
    || String(identity.aud) !== channel || identity.iss !== 'https://access.line.me'
    || !Number.isFinite(identity.exp) || identity.exp <= Date.now() / 1000
    || String(access?.client_id) !== channel || !Number.isFinite(access.expires_in) || access.expires_in <= 0) return null;
  const profileResponse = await fetcher('https://api.line.me/v2/profile', { headers: { Authorization: 'Bearer ' + accessToken }, signal: AbortSignal.timeout(8000) });
  if (!profileResponse.ok) {
    if (profileResponse.status >= 500) throw new Error('line_verification_unavailable');
    return null;
  }
  const profile = await profileResponse.json();
  if (profile?.userId !== identity.sub || typeof profile.displayName !== 'string'
    || profile.displayName.trim().length < 1 || profile.displayName.length > 200
    || /[\u0000-\u001f\u007f]/.test(profile.displayName)) return null;
  return { line_user_id: profile.userId, display_name: profile.displayName.trim() };
}
