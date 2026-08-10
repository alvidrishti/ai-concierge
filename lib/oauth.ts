// MAN — OAuth providers (Google / GitHub / Facebook).
//
// Lightweight social login that reuses the EXISTING custom session system
// (signToken + httpOnly cookie) — it does NOT replace the auth architecture.
// Each provider issues an OAuth Authorization Code flow; on success we call
// signToken() and set the same MAN cookie, so R4 fail-closed still applies.
//
// Env (server-side only, never exposed):
//   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
//   GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET
//   FACEBOOK_CLIENT_ID / FACEBOOK_CLIENT_SECRET

export interface OAuthProvider {
  id: string;
  name: string;
  color: string;
  authorizeUrl: (state: string, redirectUri: string) => string;
  tokenUrl: string;
  tokenHeaders: (code: string, redirectUri: string) => Record<string, string>;
  tokenBody: (code: string, redirectUri: string) => Record<string, string>;
  profileUrl: string;
  profileHeaders: () => Record<string, string>;
  parseProfile: (data: any) => { name: string; email?: string };
}

const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function redirectFor(provider: string): string {
  return `${base}/api/auth/oauth/callback/${provider}`;
}

export const OAUTH_PROVIDERS: Record<string, OAuthProvider> = {
  google: {
    id: "google",
    name: "Google",
    color: "#4285F4",
    authorizeUrl: (state, redirectUri) =>
      `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code` +
      `&scope=${encodeURIComponent("openid email profile")}&state=${state}`,
    tokenUrl: "https://oauth2.googleapis.com/token",
    tokenHeaders: () => ({ "Content-Type": "application/x-www-form-urlencoded" }),
    tokenBody: (code, redirectUri) => ({
      code, redirect_uri: redirectUri,
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      grant_type: "authorization_code",
    }),
    profileUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
    profileHeaders: () => ({}), // uses access_token query
    parseProfile: (d) => ({ name: d.name || d.email?.split("@")[0] || "User", email: d.email }),
  },
  github: {
    id: "github",
    name: "GitHub",
    color: "#24292f",
    authorizeUrl: (state, redirectUri) =>
      `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent("read:user user:email")}&state=${state}`,
    tokenUrl: "https://github.com/login/oauth/access_token",
    tokenHeaders: () => ({ "Content-Type": "application/json", Accept: "application/json" }),
    tokenBody: (code, redirectUri) => ({
      client_id: process.env.GITHUB_CLIENT_ID || "",
      client_secret: process.env.GITHUB_CLIENT_SECRET || "",
      code, redirect_uri: redirectUri,
    }),
    profileUrl: "https://api.github.com/user",
    profileHeaders: () => ({ Accept: "application/json", "User-Agent": "MAN" }),
    parseProfile: (d) => ({ name: d.name || d.login || "User", email: d.email }),
  },
  facebook: {
    id: "facebook",
    name: "Facebook",
    color: "#1877F2",
    authorizeUrl: (state, redirectUri) =>
      `https://www.facebook.com/v18.0/dialog/oauth?client_id=${process.env.FACEBOOK_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code` +
      `&scope=${encodeURIComponent("public_profile email")}&state=${state}`,
    tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
    tokenHeaders: () => ({ "Content-Type": "application/x-www-form-urlencoded" }),
    tokenBody: (code, redirectUri) => ({
      client_id: process.env.FACEBOOK_CLIENT_ID || "",
      client_secret: process.env.FACEBOOK_CLIENT_SECRET || "",
      code, redirect_uri: redirectUri,
    }),
    profileUrl: "https://graph.facebook.com/me?fields=name,email",
    profileHeaders: () => ({}),
    parseProfile: (d) => ({ name: d.name || "User", email: d.email }),
  },
};

export function oauthConfigured(provider: string): boolean {
  const p = OAUTH_PROVIDERS[provider];
  if (!p) return false;
  if (provider === "google") return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  if (provider === "github") return !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
  if (provider === "facebook") return !!(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET);
  return false;
}

export function redirectUri(provider: string): string {
  return redirectFor(provider);
}

export function oauthAuthorizeUrl(provider: string, state: string): string {
  return OAUTH_PROVIDERS[provider].authorizeUrl(state, redirectFor(provider));
}

// Exchange the code for tokens, then fetch the profile.
export async function oauthProfile(provider: string, code: string): Promise<{ name: string; email?: string } | null> {
  const p = OAUTH_PROVIDERS[provider];
  if (!p) return null;

  // 1. exchange code -> access token
  const tokenRes = await fetch(p.tokenUrl, {
    method: "POST",
    headers: { ...p.tokenHeaders(code, redirectFor(provider)), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(p.tokenBody(code, redirectFor(provider))).toString(),
  });
  const tokenData = await tokenRes.json().catch(() => ({}));
  const accessToken = tokenData.access_token;
  if (!accessToken) return null;

  // 2. fetch profile
  const profileRes = await fetch(p.profileUrl, {
    headers: { ...p.profileHeaders(), Authorization: `Bearer ${accessToken}` },
  });
  const profileData = await profileRes.json().catch(() => ({}));
  if (profileData.error) return null;
  return p.parseProfile(profileData);
}
