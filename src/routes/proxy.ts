// Imports TypeScript types from Fastify: FastifyInstance (represents the
// running app/server instance)and FastifyPluginOptions (base type for 
// plugin options).
import { FastifyInstance, FastifyPluginOptions } from "fastify";

// Defines the shape of a saved cache entry: the original HTTP
// status code (e.g. 200), the contentType header string (e.g. 
// application/json), and the raw binary body data stored as a
// Node.js Buffer.
type CachedResponse = {
  status: number;
  contentType: string;
  body: Buffer;
};

// Extends Fastify's standard plugin options interface to
// mandate that an origin string must be passed when
// registering this plugin.
interface ProxyPluginOptions extends FastifyPluginOptions {
  origin: string;
}

// Exports an asynchronous Fastify plugin function receiving 
// the app instance and options containing the origin URL.
export async function proxyRoutes(
    app: FastifyInstance,
    options: ProxyPluginOptions
){
    // Destructures origin from options for clean usage
    // throughout the plugin.
    // Same as const origin = options.origin;
    const { origin } = options;

    // Instantiates an in-memory Map where the key is the request
    // URL path (e.g., /products/1) represented as a string and the
    // value is a CachedResponse object. Because it lives inside
    // this function scope, it stays alive as long as the server
    // is running.
    const cache = new Map<string, CachedResponse>();

    // Admin route to clear cache
    app.delete("/__cache", async (_request, reply) => {
        // .clear() is a built-in method on JavaScript Map objects. it
        // removes all key-value pairs from the Map at once, resetting
        // its .size back to 0.
        cache.clear();
        return reply.send({ message: "Cache cleared successfully" });
    });

    // Main proxy route
    app.get("/*", async (request, reply) => {
        const key = request.url;

        // 1. Return cached response if present
        const cached = cache.get(key);
        if (cached) {
            // Cache HIT: If found, sets the custom x-cache: HIT header,
            // replicates the original status code and content-type header,
            // sends the cached Buffer body, and returns early to skip 
            // fetching from the origin.
            reply.header("x-cache", "HIT");
            reply.status(cached.status);
            reply.header("content-type", cached.contentType);
            return reply.send(cached.body);
        }

        // 2. Fetch from origin server

        // Constructs the full destination URL by appending the
        // incoming path onto origin
        const targetUrl = `${origin}${request.url}`;

        // Response is a globally built-in type in Node.js and
        // modern JavaScript environments. It comes from the
        // standard Fetch API (GlobalFetch), which was added
        // natively to Node.js starting in v18.0.0. You do
        // not need to import anything from external
        // libraries to use it.
        let originResponse: Response;

        try {
        originResponse = await fetch(targetUrl);
        } catch {
        return reply.status(502).send({ error: "Could not reach the origin server" });
        }

        // The body (the actual content, like the JSON text) arrives as
        // raw bytes. arrayBuffer() reads all those bytes, and Buffer.from
        // wraps them in the form Fastify can send. Using raw bytes means
        // images and other non-text files pass through correctly too.
        const body = Buffer.from(await originResponse.arrayBuffer());

        // Copies the content-type header, which tells the client what
        // kind of data this is (JSON, an image, and so on). The ?? means
        // "if the left side is missing, use the right side instead."
        // So if the origin sent no content type, we fall back to a 
        // generic one.
        const contentType = originResponse.headers.get("content-type") ?? "application/octet-stream";

        // 3. Cache successful responses
        if (originResponse.status === 200) {
        cache.set(key, {
            status: originResponse.status,
            contentType,
            body,
        });
        }

        // Saves responses with a 200 OK status into the cache map.
        // Prevents caching error responses like 404 Not Found or
        // 500 Internal Server Error
        reply.header("x-cache", "MISS");
        reply.status(originResponse.status);
        reply.header("content-type", contentType);
        return reply.send(body);
    });
}