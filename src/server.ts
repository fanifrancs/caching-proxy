#!/usr/bin/env node

// Shebang line above: Tells Unix/Linux systems to use the node binary found
// in the environment to execute this file directly as a CLI script.

// Imports the Fastify web framework to create HTTP server and route handlers.
import Fastify from "fastify";

// Imports Node's built-in command-line argument parser from the node:util module.
import { parseArgs } from "node:util";

// Imports the external route handler plugin function defined in ./routes/proxy.ts
// (using the .js extension required by ESM runtime resolution).
import { proxyRoutes } from "./routes/proxy.js";

// Parse CLI options
// Calls parseArgs and destructures values, which holds key-value pairs of
// the command-line flags passed by the user.
const { values } = parseArgs({
  options: {
    port: { type: "string" },
    origin: { type: "string" },
    "clear-cache": { type: "boolean" },
  },
  // Setting strict: false prevents parseArgs from throwing errors if
  // unexpected arguments or positionals are passed.
  strict: false,
});

// Handle --clear-cache action
if (values["clear-cache"]) {
  const targetPort = values.port ?? "3000";
  try {
    // Sends an HTTP DELETE request to the internal /__cache route of the
    // running proxy instance.
    const res = await fetch(`http://localhost:${targetPort}/__cache`, {
      method: "DELETE",
    });

    // If the server responds with a success status (200-299), prints a
    // success message and exits cleanly (0). Otherwise, logs an error
    // and exits with code 1. Code 1 indicates failure to the shell or
    // calling process while code 0 indicates success.
    if (res.ok) {
      console.log("Cache cleared successfully.");
      process.exit(0);
    } else {
      console.error("Failed to clear cache from running server.");
      process.exit(1);
    }
  } catch {
    console.error("Could not connect to the proxy server to clear cache. Is it running?");
    process.exit(1);
  }
}

// Validation & CLI Checks
// Ensures both --origin and --port are provided for normal server
// execution. Narrows values.origin's type to string for TypeScript safety
if (typeof values.origin !== "string" || !values.port) {
  console.error("Error: Both --port and --origin arguments are required.");
  console.error("Usage: caching-proxy --port <number> --origin <url>");
  console.error("   or: caching-proxy --clear-cache [--port <number>]");
  process.exit(1);
}

// Converts the port string to a number and verifies it is a valid
// integer within the valid network port range (1–65535).
const PORT = Number(values.port);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  console.error(`Invalid port: ${values.port}`);
  process.exit(1);
}

// Clean origin URL

// Uses conditional logic(ternary operator) to remove any
// trailing slash from the origin URL provided by the user.
// This prevents issues with double slashes when concatenating
// request paths to the origin URL.

// the statement before the ? is the condition being evaluated
// so if it evaluates to true, the expression after the ? is executed,
// otherwise the expression after the : is executed.This is a clever
// way of writing an if-else statement in a single line of code.

// The .slice() method extracts a section of an array or string and
// returns it as a new array or string, without modifying the original

// Start at index 0 (the first element), and stop right before index -1
// (the last element). In plain English: It copies everything except the
// last element. This effectively removes the trailing slash from the
// origin URL if it exists. If there is no trailing slash, it simply
// returns the original origin URL unchanged.

// DAMN! So much for a single line of code
const ORIGIN = values.origin.endsWith("/") ? values.origin.slice(0, -1) : values.origin;

// Initializes a Fastify instance with built-in request logging enabled.
// Logging gives additional information about incoming requests and
// server behavior, which is useful for debugging and monitoring.
const app = Fastify({ logger: true });

// Register proxy plugin routes
// Registers proxyRoutes as a Fastify plugin, passing
// { origin: ORIGIN } into the plugin's options parameter.
await app.register(proxyRoutes, { origin: ORIGIN });

// Start Server
// Binds Fastify to listen on PORT. If starting fails
// (e.g., port already in use), logs the error and
// terminates the process with code 1.
try {
  await app.listen({ port: PORT });
  console.log(`Caching proxy server running on port ${PORT}, forwarding to ${ORIGIN}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}