// Require the framework and instantiate it
import fastify, { FastifyInstance, FastifyRequest } from "fastify";
import path from "path";
import proximityhash from "proximityhash";
import ngeohash from "ngeohash";
import fastifyView from "@fastify/view";
import handlebars from "handlebars";
import { GeoTree } from "./trees/GeoTree/GeoTree";

const server = fastify({
  logger: true,
}).register(fastifyView, {
  engine: {
    handlebars: handlebars,
  },
  root: path.join(__dirname, "views"), // Points to `./views` relative to the current file
  layout: "./templates/template/layout.hbs", // Sets the layout to use to `./views/templates/layout.handlebars` relative to the current file.
  viewExt: "hbs", // Sets the default extension to `.handlebars`
});

// Declare a route
server.get(
  "/",
  async (
    request: FastifyRequest<{
      Querystring: { precision?: number };
    }>,
    reply,
  ) => {
    const precision = request.query.precision || 7;
    const hash = ngeohash.encode(42.50903, 1.53605, precision);
    const locationBounds = GeoTree.bounds(hash);

    const proximityGeohashes = proximityhash.createGeohashes({
      latitude: 42.50903,
      longitude: 1.53605,
      "precision": 7,
      "radius": 1000,
      georaptorFlag : true,  //set true to compress hashes using georaptor
    minlevel : 1, // minimum geohash level, default value: 1
    maxlevel : 10, // maximum geohash level, default value: 12
    approxHashCount : true // set to true to round off if the hashes count is greater than 27
    })


    const proximityBounds = proximityGeohashes.map(GeoTree.bounds)
    console.log(proximityGeohashes.length)

    return reply.view("/templates/index.hbs", { text: "malo", locationBounds: JSON.stringify(locationBounds), proximityBounds: JSON.stringify(proximityBounds) });
  },
);

// Run the server!
const start = async () => {
  try {
    await server.listen({ port: 3000 });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
