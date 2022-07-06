// Require the framework and instantiate it
import fastify, { FastifyInstance, FastifyRequest } from "fastify";
import path from "path";
import proximityhash from "proximityhash";
import ngeohash from "ngeohash";
import fastifyView from "@fastify/view";
import handlebars from "handlebars";
import { GeoTree } from "./trees/GeoTree/GeoTree";
import { parserService } from "./parse";
import { IOsmNode } from "./types/osm-read";
import { pDistance } from "./utils/distance";
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
      Querystring: { precision?: number, lat?: number, lon?: number; radius?: string};
    }>,
    reply,
  ) => {
    const radius = request.query.radius || 1000
    const precision = request.query.precision || 7;
    const currentPosition = {
      lat: 42.50903,
      lon: 1.53605,
    };
    if(request.query.lat && request.query.lon){
      currentPosition.lat = Number(request.query.lat)
      currentPosition.lon = Number(request.query.lon)
    }
    const hash = ngeohash.encode(currentPosition.lat, currentPosition.lon, precision);
    const locationBounds = GeoTree.bounds(hash);

    const proximityGeohashes = proximityhash.createGeohashes({
      latitude: currentPosition.lat,
      longitude: currentPosition.lon,
      precision: 7,
      radius: Number(radius),
      georaptorFlag: true, //set true to compress hashes using georaptor
      minlevel: 1, // minimum geohash level, default value: 1
      maxlevel: 10, // maximum geohash level, default value: 12
      approxHashCount: true, // set to true to round off if the hashes count is greater than 27
    });

    const proximityBounds = proximityGeohashes.map(GeoTree.bounds);

    const allEdges = await Promise.all(
      proximityGeohashes.map(async hash => {
        return parserService.nodes.highwayGeohash?.getAllNodes(hash) || [];
      }),
    );

    const edgeFound = new Map();
    let closestPoint: { distance: number; location: [number, number] } = {
      distance: Infinity,
      location: [0, 0],
    };

    const mergedEdges = ([] as IOsmNode[]).concat.apply([], allEdges).map(node => {
      let polylines: [number, number][][] = [];
      node.pointsToNodeSimplified?.forEach(pointsToNode => {
        // if(!edgeFound.get(`${node.id}-${pointsToNode.nodeId}`) && !edgeFound.get(`${pointsToNode.nodeId}-${node.id}`)){
        edgeFound.set(`${node.id}-${pointsToNode.nodeId}`, true);
        const edges: [number, number][] = JSON.parse(pointsToNode.polyline || "");
        for (let i = 1; i < edges.length; i++) {
          const x = { lat: edges[i - 1][0], lon: edges[i - 1][1] };
          const y = { lat: edges[i][0], lon: edges[i][1] };
          const calculation = pDistance(currentPosition.lat, currentPosition.lon, x.lat, x.lon, y.lat, y.lon);

          if (calculation.distance < closestPoint?.distance) {
            closestPoint.distance = calculation.distance;
            closestPoint.location = [calculation.point.lat, calculation.point.lon];
          }
        }
        polylines.push(edges);
        // }
      });

      return polylines;
    });

    // console.time("findingclosest")
    // mergedEdges.forEach(edges => {

    // })
    // console.timeEnd("findingclosest")

    const midpointLatLng =getMiddlePointForCurvedLine(currentPosition.lat, currentPosition.lon, closestPoint.location[0], closestPoint.location[1])
    // console.log("response")
    return reply.view("/templates/index.hbs", {
      text: "malo",
      locationBounds: JSON.stringify(locationBounds),
      proximityBounds: JSON.stringify(proximityBounds),
      edges: JSON.stringify(mergedEdges),
      closestPoint: JSON.stringify(closestPoint.location),
      currentPosition: JSON.stringify([currentPosition.lat, currentPosition.lon]),
      midpointLatLng: JSON.stringify(midpointLatLng),
      radius
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

start();
