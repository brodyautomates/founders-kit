// Keeps upstream PocketBase tokens alive.
//
// A background sweep runs on an interval and renews any session whose token is
// getting close to expiry. A second path renews inline right before a tool call
// if the token is about to lapse, so requests never fail on a token that could
// have been refreshed a moment earlier.

import { listSessions, updateSession, deleteSession, type Session } from "./session-store.js";
import { refreshPbToken } from "./identity.js";

const SWEEP_EVERY_MS = 30 * 60_000; // check every half hour
const SWEEP_LEAD_SEC = 6 * 60 * 60; // renew when within 6h of expiry
const INLINE_LEAD_SEC = 5 * 60; // renew inline when within 5m of expiry

let sweepTimer: NodeJS.Timeout | null = null;

async function renew(session: Session): Promise<void> {
  try {
    const fresh = await refreshPbToken(session.pbToken);
    updateSession(session.sid, {
      pbToken: fresh.pbToken,
      pbTokenExp: fresh.pbTokenExp,
    });
  } catch (error: any) {
    console.error(
      `[refresher] could not renew session ${session.sid.slice(0, 8)}: ${error.message}`,
    );
    // A 401/403 means the upstream token is dead for good — drop the session so
    // the user is forced to sign in again.
    if (error.message.includes("401") || error.message.includes("403")) {
      deleteSession(session.sid);
    }
  }
}

export function startRefreshLoop(): void {
  if (sweepTimer) return;
  sweepTimer = setInterval(async () => {
    const nowSec = Math.floor(Date.now() / 1000);
    for (const session of listSessions()) {
      if (session.pbTokenExp && session.pbTokenExp - nowSec < SWEEP_LEAD_SEC) {
        await renew(session);
      }
    }
  }, SWEEP_EVERY_MS);
  // Don't let the timer keep the process alive on its own.
  if (sweepTimer && typeof sweepTimer.unref === "function") sweepTimer.unref();
}

/**
 * Return a currently-valid PocketBase token for a session, refreshing first if
 * it is about to expire. Returns null when the session no longer exists.
 */
export async function ensureFreshPbToken(sid: string): Promise<string | null> {
  const session = listSessions().find((s) => s.sid === sid);
  if (!session) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  if (session.pbTokenExp && session.pbTokenExp - nowSec < INLINE_LEAD_SEC) {
    await renew(session);
    const renewed = listSessions().find((s) => s.sid === sid);
    return renewed?.pbToken || null;
  }
  return session.pbToken;
}
