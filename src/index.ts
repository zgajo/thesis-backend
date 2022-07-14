// Require the framework and instantiate it
import fastifyView from "@fastify/view";
import fastify, { FastifyRequest } from "fastify";
import handlebars from "handlebars";
import path from "path";
import { AStar } from "./graph/Astar";
import { parserService } from "./parse";
import { getNearestPoint } from "./services/nearest-point";
import { IOsmNode, IOsmWay, TPointsToNode } from "./types/osm-read";
import { getMiddlePointForCurvedLine } from "./utils/leaflet";

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
      Querystring: { precision?: number; lat?: number; lon?: number; radius?: string };
    }>,
    reply,
  ) => {
    const radius = request.query.radius || 1000;
    const precision = request.query.precision || 7;
    const currentPosition = {
      lat: 42.50903,
      lon: 1.53605,
    };
    if (request.query.lat && request.query.lon) {
      currentPosition.lat = Number(request.query.lat);
      currentPosition.lon = Number(request.query.lon);
    }
    const { closestPoint, mergedEdges, proximityBounds, locationBounds } = await getNearestPoint(currentPosition, precision, radius, parserService);
    const midpointLatLng = getMiddlePointForCurvedLine(currentPosition.lat, currentPosition.lon, closestPoint.location[0], closestPoint.location[1]);

    const startNode = parserService.nodes.highwayGeohash?.getNode("sp94hkqnqr") as IOsmNode;
    const endNode = parserService.nodes.highwayGeohash?.getNode("sp94hkcn0m") as IOsmNode;
    const start = parserService.nodes.highwaySimplified?.get("53276381");
    const end = parserService.nodes.highwaySimplified?.get("4526119356");
    // "sp94hkqnqr" - "53276381" - 42.5635230, 1.6015333
    // "sp919fqvj0" - 52261866 - 42.4643946, 1.4926460
    // "sp91gt6vdq" - "625037" - 42.52493531, 1.56393707
    // sp94hkfs5y - 3840440576- 42.5659164, 1.5966123
    // sp94hkcn0m - 4526119356- 42.5662131, 1.5944025
    // "sp94hkfsed" - 3840440595 - 42.5659795, 1.5966076
    // "sp94hmhb0j" - 2287019228 - 42.5665582, 1.5995507
    // "sp94hkuvtz" - 53275040 - 42.5661390, 1.5997895

    const astar = new AStar(parserService.averageSpeed);

    if (closestPoint.pointsToGeohash.length > 1) {
      astar.addDisabledEdge(closestPoint.pointsToGeohash[0], closestPoint.pointsToGeohash[1]);
      astar.addDisabledEdge(closestPoint.pointsToGeohash[1], closestPoint.pointsToGeohash[0]);
    }

    const n: IOsmNode = {
      id: closestPoint.id,
      geohash: closestPoint.geohash,
      lat: closestPoint.location[0],
      lon: closestPoint.location[1],
      type: "node",
      pointsToNodeSimplified: closestPoint.distanceTo.map((distance, index) => {
        const connection: TPointsToNode = {
          distance,
          highway: closestPoint.highway,
          node: closestPoint.pointsToNode[index],
          nodeId: closestPoint.pointsToNode[index].id,
          polyline: closestPoint.polyline[index],
          speed: closestPoint.speed,
          travelTime: closestPoint.travelTimeTo[index],
          way: closestPoint.way as IOsmWay,
        };

        return connection;
      }),
    };

    const { route, current } = astar.search(n, endNode);

    return reply.view("/templates/index.hbs", {
      text: "malo",
      locationBounds: JSON.stringify(locationBounds),
      proximityBounds: JSON.stringify(proximityBounds),
      edges: JSON.stringify(mergedEdges),
      closestPoint: JSON.stringify(closestPoint.location),
      currentPosition: JSON.stringify([currentPosition.lat, currentPosition.lon]),
      midpointLatLng: JSON.stringify(midpointLatLng),
      radius,
      route: JSON.stringify(route),
      startRoutePoint: JSON.stringify([n.lat, n.lon]),
      endRoutePoint: JSON.stringify([endNode.lat, endNode.lon]),
    });
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

setTimeout(() => {
  start();
}, 2000);
