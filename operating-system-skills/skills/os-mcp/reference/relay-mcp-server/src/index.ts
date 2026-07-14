// Entry point. Validate the environment before anything else, then hand off to
// the HTTP layer.

import { verifyEnvironment } from "./env.js";
import { startServer } from "./http-server.js";

verifyEnvironment();

try {
  startServer();
} catch (error) {
  console.error(error);
  process.exit(1);
}
