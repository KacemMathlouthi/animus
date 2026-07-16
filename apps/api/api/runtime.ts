/** TEMPORARY diagnostic function — zero imports so it cannot crash on module
 * resolution. Reports which JS runtime actually executes Vercel functions in
 * this project, to verify whether vercel.json's bunVersion is honored.
 * Delete once the runtime question is settled. */

export default {
  fetch(): Response {
    return Response.json({
      bun: process.versions.bun ?? null,
      node: process.version,
      runtime: typeof Bun === "undefined" ? "node" : "bun",
    });
  },
};
