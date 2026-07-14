// The OAuth 2.1 authorization-server implementation the MCP SDK plugs into.
//
// Identity is delegated to Relay.md (via PocketBase password auth). The flow:
//   /authorize        -> park Claude's params, render our sign-in page
//   POST /oauth/login -> verify credentials, mint a one-time code, redirect back
//   token exchange    -> swap the code (or a refresh token) for a signed JWT
//
// The two exported form handlers (login, reset) are wired to Express routes in
// the HTTP layer.

import type { Response } from "express";
import type {
  OAuthServerProvider,
  AuthorizationParams,
} from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import type {
  OAuthClientInformationFull,
  OAuthTokens,
  OAuthTokenRevocationRequest,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import {
  InvalidGrantError,
  InvalidTokenError,
} from "@modelcontextprotocol/sdk/server/auth/errors.js";

import { ALLOWED_EMAILS, STATIC_MCP_BEARER } from "../env.js";
import { clientsStore } from "./client-registry.js";
import { createPending, consumePending, touchPending } from "./pending-auth.js";
import { createCode, consumeCode, peekCode } from "./grant-codes.js";
import { createSession, getSession } from "./session-store.js";
import { authWithPassword, requestPasswordReset } from "./identity.js";
import {
  signAccessToken,
  verifyAccessJwt,
  issueRefreshToken,
  redeemRefreshToken,
  revokeRefreshToken,
  ACCESS_TOKEN_TTL_SEC,
} from "./access-tokens.js";
import {
  LOGIN_PATH,
  RESET_PATH,
  renderLoginPage,
  renderErrorPage,
} from "./pages.js";

// Re-export so the HTTP layer only needs to import from the provider.
export { LOGIN_PATH, RESET_PATH };

export class RelayOAuthProvider implements OAuthServerProvider {
  get clientsStore(): OAuthRegisteredClientsStore {
    return clientsStore;
  }

  // Step 1: stash Claude's OAuth request and show the sign-in form.
  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response,
  ): Promise<void> {
    const pending = createPending({
      claudeClientId: client.client_id,
      claudeRedirectUri: params.redirectUri,
      claudeState: params.state,
      claudeCodeChallenge: params.codeChallenge,
      claudeResource: params.resource?.toString(),
    });

    res
      .status(200)
      .type("text/html")
      .send(renderLoginPage({ state: pending.localState }));
  }

  // The SDK asks us for the PKCE challenge tied to a code before exchange.
  async challengeForAuthorizationCode(
    _client: OAuthClientInformationFull,
    authorizationCode: string,
  ): Promise<string> {
    const grant = peekCode(authorizationCode);
    if (!grant) throw new InvalidGrantError("authorization code is invalid or expired");
    return grant.codeChallenge;
  }

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
    _codeVerifier?: string,
    _redirectUri?: string,
    _resource?: URL,
  ): Promise<OAuthTokens> {
    const grant = consumeCode(authorizationCode);
    if (!grant) throw new InvalidGrantError("authorization code is invalid or expired");
    if (grant.clientId !== client.client_id) {
      throw new InvalidGrantError("authorization code belongs to a different client");
    }

    const session = getSession(grant.sid);
    if (!session) throw new InvalidGrantError("the session for this code no longer exists");

    const accessToken = await signAccessToken({
      sid: session.sid,
      email: session.email,
      clientId: client.client_id,
    });
    const refreshToken = issueRefreshToken(session.sid, client.client_id);

    return {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL_SEC,
      refresh_token: refreshToken,
    };
  }

  async exchangeRefreshToken(
    client: OAuthClientInformationFull,
    refreshToken: string,
    _scopes?: string[],
    _resource?: URL,
  ): Promise<OAuthTokens> {
    const redeemed = redeemRefreshToken(refreshToken);
    if (!redeemed) throw new InvalidGrantError("refresh token is invalid or expired");
    if (redeemed.clientId !== client.client_id) {
      throw new InvalidGrantError("refresh token belongs to a different client");
    }

    const session = getSession(redeemed.sid);
    if (!session) {
      revokeRefreshToken(refreshToken);
      throw new InvalidGrantError("the session for this refresh token no longer exists");
    }

    const accessToken = await signAccessToken({
      sid: session.sid,
      email: session.email,
      clientId: client.client_id,
    });

    // Rolling refresh: the same refresh token stays valid for its full window.
    return {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL_SEC,
      refresh_token: refreshToken,
    };
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    // Static bearer path: a fixed secret for CLI / scripts that skips OAuth.
    if (STATIC_MCP_BEARER && token === STATIC_MCP_BEARER) {
      return {
        token,
        clientId: "static-bearer",
        scopes: [],
        expiresAt: Math.floor(Date.now() / 1000) + 60 * 60,
        extra: { mode: "static" },
      };
    }

    try {
      const claims = await verifyAccessJwt(token);
      const session = getSession(claims.sid);
      if (!session) throw new InvalidTokenError("the session for this token no longer exists");
      return {
        token,
        clientId: claims.clientId,
        scopes: [],
        expiresAt: claims.expSec,
        extra: {
          mode: "oauth",
          sid: claims.sid,
          email: claims.email,
        },
      };
    } catch (error: any) {
      if (error instanceof InvalidTokenError) throw error;
      throw new InvalidTokenError(error.message || "access token could not be verified");
    }
  }

  async revokeToken(
    _client: OAuthClientInformationFull,
    request: OAuthTokenRevocationRequest,
  ): Promise<void> {
    // We only track refresh tokens server-side, so that's all there is to drop.
    if (request.token_type_hint === "refresh_token" || !request.token_type_hint) {
      revokeRefreshToken(request.token);
    }
  }
}

type LoginOutcome =
  | { redirectUrl: string }
  | { pageHtml: string; status: number };

/** Handles POST /oauth/login (the sign-in form submission). */
export async function handleLogin(input: {
  state: string;
  email: string;
  password: string;
}): Promise<LoginOutcome> {
  const pending = consumePending(input.state);
  if (!pending) {
    return {
      pageHtml: renderErrorPage(
        "Session expired",
        "This sign-in link is no longer valid. Start the connection again from Claude.",
      ),
      status: 400,
    };
  }

  // Reissue a fresh pending record so the user can retry against the same
  // parked Claude request without starting over.
  const reissuePending = () =>
    createPending({
      claudeClientId: pending.claudeClientId,
      claudeRedirectUri: pending.claudeRedirectUri,
      claudeState: pending.claudeState,
      claudeCodeChallenge: pending.claudeCodeChallenge,
      claudeResource: pending.claudeResource,
    });

  if (!input.email || !input.password) {
    return {
      pageHtml: renderLoginPage({
        state: reissuePending().localState,
        error: "Enter both an email and a password.",
        email: input.email,
      }),
      status: 400,
    };
  }

  let pb;
  try {
    pb = await authWithPassword({
      identity: input.email.trim(),
      password: input.password,
    });
  } catch (error: any) {
    return {
      pageHtml: renderLoginPage({
        state: reissuePending().localState,
        error: error.message || "Sign-in failed",
        email: input.email,
      }),
      status: 401,
    };
  }

  if (ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.includes(pb.email)) {
    return {
      pageHtml: renderErrorPage(
        "Not authorized",
        `The account ${pb.email} is not on the allow-list for this server.`,
      ),
      status: 403,
    };
  }

  // Credentials are good — open a session and hand Claude a one-time code.
  const session = createSession({
    pbToken: pb.pbToken,
    pbTokenExp: pb.pbTokenExp,
    email: pb.email,
    recordId: pb.recordId,
  });

  const grant = createCode({
    sid: session.sid,
    clientId: pending.claudeClientId,
    redirectUri: pending.claudeRedirectUri,
    codeChallenge: pending.claudeCodeChallenge,
    resource: pending.claudeResource,
  });

  const redirect = new URL(pending.claudeRedirectUri);
  redirect.searchParams.set("code", grant.code);
  if (pending.claudeState) redirect.searchParams.set("state", pending.claudeState);
  return { redirectUrl: redirect.toString() };
}

/**
 * Handles POST /oauth/reset-request. Always re-renders the login page with a
 * neutral banner so the response never reveals whether an account exists.
 */
export async function handleResetRequest(input: {
  state: string;
  email: string;
}): Promise<{ pageHtml: string; status: number }> {
  const pending = touchPending(input.state);
  if (!pending) {
    return {
      pageHtml: renderErrorPage(
        "Session expired",
        "This sign-in link is no longer valid. Start the connection again from Claude.",
      ),
      status: 400,
    };
  }

  const email = (input.email || "").trim();
  if (!email) {
    return {
      pageHtml: renderLoginPage({
        state: pending.localState,
        error: "Enter an email address to receive a reset link.",
      }),
      status: 400,
    };
  }

  try {
    await requestPasswordReset(email);
  } catch (error: any) {
    // Swallow the error and still show the neutral banner below.
    console.error("[reset-request] failed:", error.message);
  }

  return {
    pageHtml: renderLoginPage({
      state: pending.localState,
      email,
      banner: {
        type: "success",
        text: `If ${email} is a Relay.md account, a password reset email is on the way. Set a password, then return here to sign in.`,
      },
    }),
    status: 200,
  };
}
