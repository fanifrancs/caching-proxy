# Caching Proxy Server CLI

A lightweight, performant Command Line Interface (CLI) caching proxy server built with Node.js, Fastify, and TypeScript. 

This tool sits between a client and an origin server, forwarding incoming HTTP requests to the target origin, caching successful responses in memory, and serving subsequent requests directly from the cache to reduce bandwidth and response latency.

## What is a Caching Proxy Server & Why Use It?

A **Caching Proxy Server** acts as an intermediary for requests from clients seeking resources from an origin server. 

### Key Benefits:
- **Reduced Latency:** Responses served from memory skip the round-trip network hop to the origin, responding in milliseconds.
- **Lower Upstream Load:** Decreases traffic and server overhead on your main backend APIs.
- **Bandwidth Conservation:** Minimizes redundant data transfers across the network.

## Tech Stack & Tools

- **Language:** TypeScript
- **Runtime Engine:** Node.js (v20+)
- **Web Framework:** [Fastify](https://www.fastify.io/)
- **CLI Parsing:** `node:util` (`parseArgs`)
- **Development Tooling:** `tsx` (TypeScript Execution) & `tsc` (TypeScript Compiler)

## How It Works
1. **First Request (`MISS`):** The proxy receives a request, fetches the response from the origin, caches successful (`200 OK`) responses as binary buffers, sets an `X-Cache: MISS` header, and returns the response.
2. **Subsequent Request (`HIT`):** If the URL path matches a cached entry, the proxy immediately returns the stored response along with an `X-Cache: HIT` header.
3. **Cache Clearing:** An internal admin endpoint (`DELETE /__cache`) allows wiping the in-memory store on demand via CLI.

## Programming Concepts Demonstrated

Building this project covers key backend and system engineering principles:

- **CLI & Argument Parsing:** Extracting flags (`--port`, `--origin`, `--clear-cache`) and enforcing option validation using native Node tools.
- **Proxying & Network Forwarding:** Forwarding requests across networks while preserving HTTP statuses, headers, and payload bodies.
- **In-Memory Data Structures:** Utilizing JavaScript `Map` data structures for $O(1)$ key-value lookup operations.
- **Binary Data Handling:** Preserving raw response payloads (JSON, images, text) using Node.js `Buffer` objects to avoid character encoding corruption.
- **Modular Plugin Architecture:** Structuring routes and route options using Fastify's encapsulated plugin architecture (`async (app, opts)`).
- **Executable Binaries & Path Symlinking:** Configuring executable shebangs (`#!/usr/bin/env node`) and NPM binary mappings (`package.json` `bin`).

## Quickstart & Setup Instructions

### Prerequisites
- Node.js v20.0.0 or higher
- npm installed

### 1. Installation & Local Setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/fanifrancs/caching-proxy.git
cd caching-proxy
npm install
```

### 2. Development Mode
Run the proxy in development mode without building:

```bash
npm run dev -- --port <number> --origin <URL>
```
Example:
```bash
npm run dev -- --port 3000 --origin https://dummyjson.com
```

## Global CLI Usage
To install the CLI command globally on your machine:

```bash
# Build TypeScript files to dist/
npm run build
```
```bash
# Link the package globally
npm link
```
### Starting the Proxy Server
```bash
caching-proxy --port 3000 --origin https://dummyjson.com
```
You can as well use any port and origin.

### Testing the Caching Behavior
In a separate terminal, issue curl requests to inspect response headers:

```bash
# First request -> X-Cache: MISS
curl -i http://localhost:3000/products/1
```

```bash
# Second request(the same request) -> X-Cache: HIT
curl -i http://localhost:3000/products/1
```

### Clearing the Cache
To clear all stored entries from the running proxy server:

```bash
caching-proxy --clear-cache --port <number>
```

## Extras
This Repo serves as a solution to roadmap.sh [caching proxy challenge](https://roadmap.sh/projects/caching-server)