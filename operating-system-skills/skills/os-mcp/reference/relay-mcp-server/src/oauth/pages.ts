// Server-rendered HTML for the browser side of the OAuth flow: the sign-in form
// (with an expandable password-reset section) and a generic error page.

export const LOGIN_PATH = "/oauth/login";
export const RESET_PATH = "/oauth/reset-request";

export type Banner = { type: "info" | "success" | "error"; text: string };

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const PAGE_STYLE = `
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f14; color: #e6edf3; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1rem; }
  .card { background: #131a22; padding: 2rem 2.25rem; border-radius: 14px; width: 100%; max-width: 400px; box-shadow: 0 12px 44px rgba(0,0,0,.4); border: 1px solid #1f2a35; }
  h1 { font-size: 1.25rem; margin: 0 0 .5rem; }
  p.sub { color: #8b98a5; margin: 0 0 1.5rem; font-size: .9rem; }
  label { display: block; font-size: .85rem; margin-bottom: .35rem; color: #c3ccd5; }
  input { width: 100%; box-sizing: border-box; padding: .625rem .75rem; border-radius: 8px; border: 1px solid #2a3742; background: #0b0f14; color: #f2f6fa; font-size: .95rem; margin-bottom: 1rem; }
  input:focus { outline: none; border-color: #00ffab; }
  button { width: 100%; padding: .7rem; background: #00ffab; color: #06120d; border: 0; border-radius: 8px; font-weight: 600; font-size: .95rem; cursor: pointer; }
  button:hover { background: #4dffc6; }
  button.secondary { background: transparent; color: #c3ccd5; border: 1px solid #2a3742; font-weight: 500; }
  button.secondary:hover { background: #0b0f14; border-color: #00ffab; color: #d7fff0; }
  .err { background: #3b0d0d; border: 1px solid #7a1e1e; color: #fbc4c4; padding: .6rem .75rem; border-radius: 8px; font-size: .85rem; margin-bottom: 1rem; }
  .banner { padding: .6rem .75rem; border-radius: 8px; font-size: .85rem; margin-bottom: 1rem; }
  .banner-info { background: #0a3a4a; border: 1px solid #0e5a72; color: #b3e6f5; }
  .banner-success { background: #063d2c; border: 1px solid #0a7a53; color: #b6f5d8; }
  .banner-error { background: #3b0d0d; border: 1px solid #7a1e1e; color: #fbc4c4; }
  details { margin-top: 1.25rem; border-top: 1px solid #2a3742; padding-top: 1.25rem; }
  summary { cursor: pointer; color: #8b98a5; font-size: .85rem; list-style: none; user-select: none; }
  summary:hover { color: #c3ccd5; }
  summary::-webkit-details-marker { display: none; }
  summary:before { content: "\\203A  "; display: inline-block; transition: transform .15s; }
  details[open] summary:before { transform: rotate(90deg); }
  details .sub2 { color: #6b7784; font-size: .8rem; margin: .75rem 0 1rem; line-height: 1.4; }
`;

export function renderLoginPage(opts: {
  state: string;
  error?: string;
  banner?: Banner;
  email?: string;
}): string {
  const errorBlock = opts.error
    ? `<p class="err">${escapeHtml(opts.error)}</p>`
    : "";
  const bannerBlock = opts.banner
    ? `<p class="banner banner-${opts.banner.type}">${escapeHtml(opts.banner.text)}</p>`
    : "";
  const emailValue = opts.email ? escapeHtml(opts.email) : "";
  const state = escapeHtml(opts.state);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sign in — The Brody Operating System</title>
<style>${PAGE_STYLE}</style>
</head>
<body>
<div class="card">
  <h1>Connect your vault</h1>
  <p class="sub">Sign in with the email and password for your Relay.md account.</p>
  ${bannerBlock}${errorBlock}
  <form method="POST" action="${LOGIN_PATH}">
    <input type="hidden" name="state" value="${state}">
    <label for="email">Email</label>
    <input id="email" name="email" type="email" autocomplete="email" value="${emailValue}" required autofocus>
    <label for="password">Password</label>
    <input id="password" name="password" type="password" autocomplete="current-password" required>
    <button type="submit">Sign in</button>
  </form>
  <details>
    <summary>No password yet, or forgot it?</summary>
    <p class="sub2">Accounts created through Google, GitHub or Microsoft may not have a password set. Enter your email and Relay.md will send you a reset link. Set a password, then return here to sign in.</p>
    <form method="POST" action="${RESET_PATH}">
      <input type="hidden" name="state" value="${state}">
      <label for="reset_email">Email</label>
      <input id="reset_email" name="email" type="email" autocomplete="email" value="${emailValue}" required>
      <button type="submit" class="secondary">Email me a reset link</button>
    </form>
  </details>
</div>
</body>
</html>`;
}

export function renderErrorPage(title: string, message: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>body{font-family:-apple-system,sans-serif;background:#0b0f14;color:#e6edf3;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}.card{background:#131a22;padding:2rem;border-radius:14px;max-width:420px;border:1px solid #1f2a35}h1{margin:0 0 .75rem;color:#fca5a5}p{color:#c3ccd5}</style>
</head><body><div class="card"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><p>You can close this tab.</p></div></body></html>`;
}
