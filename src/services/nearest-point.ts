import proximityHash from "proximityhash";
import ngeohash from "ngeohash";

import { GeoTree } from "../trees/GeoTree/GeoTree";
import { IOsmNode, IOsmWay } from "../types/osm-read";
import { calculateTravelTime, pDistance } from "../utils/distance";
import { Parser } from "./parser";
import { _isPathOneWay } from "../utils/helper";
import { haversine } from "../graph/Astar";

export interface ClosestPoint {
  id: string;
  geohash: string;
  distance: number;
  location: [number, number];
  pointsToGeohash: string[];
  pointsToNode: IOsmNode[];
  polyline: string[];
  distanceTo: number[];
  travelTimeTo: number[];
  highway: string;
  speed: number;
  way: IOsmWay | undefined;
}

export const getNearestPoint = async (
  currentPosition: {
    lat: number;
    lon: number;
  },
  precision: number,
  radius: number,
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

  let closestPoint: ClosestPoint = {
    id: "",
    geohash: "",
    distance: Infinity,
    location: [0, 0],
    pointsToGeohash: [],
    pointsToNode: [],
    distanceTo: [],
    travelTimeTo: [],
    highway: "",
    speed: 0,
    polyline: [],
    way: undefined
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
          closestPoint.highway = pointsToNode.highway;
          closestPoint.speed = pointsToNode.speed as number;
          closestPoint.way = pointsToNode.way

          const geohash = ngeohash.encode(calculation.point.lat, calculation.point.lon, precision);
          closestPoint.id = geohash
          closestPoint.geohash = geohash
          closestPoint.pointsToGeohash = [pointsToNode.node.geohash as string];

          const edgesFromStartToX = edges.slice(0, i)
          const edgesFromYToEnd = edges.slice(i)
          // add closest point to both arrays
          edgesFromStartToX.push([...closestPoint.location])
          edgesFromYToEnd.unshift([...closestPoint.location])

          let startToClosestDistance = 0
          let closestToEndDistance = 0
          // calculate distance between start and to closestPoint
          for (let index = 1; index < edgesFromStartToX.length; index++) {
            const previousCords = edgesFromStartToX[index - 1];
            const currentCords = edgesFromStartToX[index];
            
            startToClosestDistance += haversine({lat: previousCords[0], lon: previousCords[1]}, {lat: currentCords[0], lon: currentCords[1]})
          }
          
          const startToClosestTravelTime = calculateTravelTime(closestPoint.speed, startToClosestDistance)
          
          // calculate distance between closestPoint and next node
          for (let index = 1; index < edgesFromYToEnd.length; index++) {
            const previousCords = edgesFromYToEnd[index - 1];
            const currentCords = edgesFromYToEnd[index];
            
            closestToEndDistance += haversine({lat: previousCords[0], lon: previousCords[1]}, {lat: currentCords[0], lon: currentCords[1]})
          }

          const closestToEndTravelTime = calculateTravelTime(closestPoint.speed as number, closestToEndDistance)

          closestPoint.distanceTo = [closestToEndDistance];
          closestPoint.travelTimeTo = [closestToEndTravelTime]
          closestPoint.polyline = [JSON.stringify(edgesFromYToEnd)]
          closestPoint.pointsToNode = [pointsToNode.node] 
          
          const isOneWay = _isPathOneWay(pointsToNode.way);
          if (!isOneWay) {
            closestPoint.distanceTo.push(startToClosestDistance)
            closestPoint.travelTimeTo.push(startToClosestTravelTime);
            closestPoint.pointsToGeohash.push(node.geohash as string);
            closestPoint.polyline.push(JSON.stringify(edgesFromStartToX))
            closestPoint.pointsToNode.push(node)
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
