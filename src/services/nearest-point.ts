import proximityHash from "proximityhash";
import ngeohash from "ngeohash";

import { GeoTree } from "../trees/GeoTree/GeoTree";
import { IOsmNode } from "../types/osm-read";
import { pDistance } from "../utils/distance";
import { Parser } from "./parser";
import { _isPathOneWay } from '../utils/helper';

export const getNearestPoint = async (
  currentPosition: {
    lat: number;
    lon: number;
  },
  precision: number,
  radius: string | 1000,
  parserService: InstanceType<typeof Parser>,
) => {
  // using this to show geohash box on the map
  const hash = ngeohash.encode(currentPosition.lat, currentPosition.lon, precision);
  const locationBounds = hash && GeoTree.bounds(hash);

  // GET all geohashes around the location
  const proximityGeohashes = proximityHash.createGeohashes({
    latitude: currentPosition.lat,
    longitude: currentPosition.lon,
    precision: 7,
    radius: Number(radius),
    georaptorFlag: true, //set true to compress hashes using georaptor
    minlevel: 1, // minimum geohash level, default value: 1
    maxlevel: 10, // maximum geohash level, default value: 12
    approxHashCount: true, // set to true to round off if the hashes count is greater than 27
  });

  // transform all geohashes into bounds to show it on the map
  const proximityBounds = proximityGeohashes.map(GeoTree.bounds);

  // get all highway nodes for every proximity geohash
  const allEdges = await Promise.all(
    proximityGeohashes.map(async hash => {
      return parserService.nodes.highwayGeohash?.getAllNodes(hash) || [];
    }),
  );

  let closestPoint: { distance: number; location: [number, number]; pointsTo: string[] } = {
    distance: Infinity,
    location: [0, 0],
    pointsTo: []
  };

  const mergedEdges = ([] as IOsmNode[]).concat.apply([], allEdges).map(node => {
    let polylines: [number, number][][] = [];
    node.pointsToNodeSimplified?.forEach(pointsToNode => {
      const edges: [number, number][] = JSON.parse(pointsToNode.polyline || "");

      for (let i = 1; i < edges.length; i++) {
        const x = { lat: edges[i - 1][0], lon: edges[i - 1][1] };
        const y = { lat: edges[i][0], lon: edges[i][1] };

        const calculation = pDistance(currentPosition.lat, currentPosition.lon, x.lat, x.lon, y.lat, y.lon);

        if (calculation.distance < closestPoint?.distance) {
          closestPoint.distance = calculation.distance;
          closestPoint.location = [calculation.point.lat, calculation.point.lon];
          const isOneWay = _isPathOneWay(pointsToNode.way)
          
          closestPoint.pointsTo = []
          
          closestPoint.pointsTo.push(pointsToNode.node.geohash as string)
          
          if(!isOneWay){
            closestPoint.pointsTo.push(node.geohash as string)
          }
        }
      }
      polylines.push(edges);
    });

    return polylines;
  });

  return {
    closestPoint,
    mergedEdges,
    proximityBounds,
    locationBounds,
  };
};
