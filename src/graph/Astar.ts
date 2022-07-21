import ngeohash from 'ngeohash'
import { isForBike, isForDriving, isForWalking } from "../services/parser-helper";
import { IOsmNode, TPointsToNode } from "../types/osm-read";
import { calculateTravelTime, greatCircleVec } from "../utils/distance";
import { getPenaltyTransition } from "../utils/routing";

export function heuristic(a: IOsmNode, b: IOsmNode) {
  // euclidian distance
  return Math.abs(a.lat - b.lat) + Math.abs(a.lon - b.lon);
}
// See list of heuristics: http://theory.stanford.edu/~amitp/GameProgramming/Heuristics.html
const manhattan = (pos0: IOsmNode, pos1: IOsmNode) => {
  var d1 = Math.abs(pos1.lat - pos0.lat);
  var d2 = Math.abs(pos1.lon - pos0.lon);
  return d1 + d2;
};

const diagonal = function (pos0: IOsmNode, pos1: IOsmNode) {
  var D = 1;
  var D2 = Math.sqrt(2);
  var d1 = Math.abs(pos1.lat - pos0.lat);
  var d2 = Math.abs(pos1.lon - pos0.lon);
  return D * (d1 + d2) + (D2 - 2 * D) * Math.min(d1, d2);
};

type Position = { lat: number; lon: number };
// https://www.movable-type.co.uk/scripts/latlong.html
export const haversine = (a: IOsmNode | Position, b: IOsmNode | Position) => {
  const R = 6371e3; // metres
  const φ1 = (a.lat * Math.PI) / 180; // φ, λ in radians
  const φ2 = (b.lat * Math.PI) / 180;
  const Δφ = ((b.lat - a.lat) * Math.PI) / 180;
  const Δλ = ((b.lon - a.lon) * Math.PI) / 180;

  const calculation = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(calculation), Math.sqrt(1 - calculation));

  const d = R * c; // in metres

  return d;
};

export class SearchNode {
  node: IOsmNode;
  previous: SearchNode | null;
  gScore: number;
  fScore: number;
  hScore: number;
  visited: boolean;
  closed: boolean;
  highway?: string;
  distance: number;
  travelTime: number;
  polyline?: [number, number][];

  constructor(node: IOsmNode) {
    this.gScore = 0;
    this.fScore = 0;
    this.hScore = 0;
    this.distance = 0;
    this.travelTime = 0;
    this.node = node;
    this.previous = null;
    this.visited = false;
    this.closed = false;
  }
}

export class AStar {
  private avgSpeed: number;
  private disabledEdges: Map<string, boolean>;
  constructor(avgSpeed: number) {
    this.avgSpeed = avgSpeed;
    this.disabledEdges = new Map();
  }

  addDisabledEdge(from: string, to: string) {
    this.disabledEdges.set(`${from}-${to}`, true);
  }

  search(start: IOsmNode, end: IOsmNode) {
    let openSet: SearchNode[] = [new SearchNode(start)]; //array containing unevaluated grid points
    let closedSet: SearchNode[] = []; //array containing completely evaluated grid points
    let path = [];

    while (openSet.length > 0) {
      //assumption lowest index is the first one to begin with
      let lowestIndex = 0;
      for (let i = 0; i < openSet.length; i++) {
        if (openSet[i].fScore < openSet[lowestIndex].fScore) {
          lowestIndex = i;
        }
      }
      let current = openSet[lowestIndex];

      if (current.node.geohash === end.geohash) {
        let temp = current;
        path.push(temp);
        let route: [number, number][][] = [];
        let distance = 0;
        let travelTime = 0;
        while (temp.previous) {
          path.push(temp.previous);
          if (temp.polyline) {
            route.push(temp.polyline);
          }
          travelTime += temp.travelTime;
          distance += temp.distance;
          temp = temp.previous;
        }
        console.log("DONE!");
        console.log("openSet!", openSet.length);
        console.log("closedSet!", closedSet.length);
        // return the traced path
        return {
          route,
          current,
          distance,
          travelTime,
        };
      }

      //remove current from openSet
      openSet.splice(lowestIndex, 1);
      //add current to closedSet
      closedSet.push(current);

      let neighbors = current.node.pointsToNodeSimplified;

      if (!neighbors) break;

      for (let i = 0; i < neighbors.length; i++) {
        const connection = neighbors[i];

        let neighbor = new SearchNode(neighbors[i].node);

        if (!closedSet.find(n => n.node.id === connection.nodeId)) {
          let penalty = 0;
          if (current.highway) {
            penalty = getPenaltyTransition(current.highway, connection.highway);
          }
          let possibleG = current.gScore + (connection.travelTime as number) + penalty;

          const neighbourghInOpenSet = openSet.find(n => n.node.id === connection.nodeId);
          if (neighbourghInOpenSet) neighbor = neighbourghInOpenSet;
          if (!neighbourghInOpenSet) {
            openSet.push(neighbor);
          } else if (possibleG >= neighbor.gScore) {
            continue;
          }

          const heuristicNeighbourghToEnd = greatCircleVec(neighbor.node.lat, neighbor.node.lon, end.lat, end.lon);
          neighbor.gScore = possibleG;
          neighbor.hScore = calculateTravelTime(this.avgSpeed, heuristicNeighbourghToEnd);
          neighbor.fScore = neighbor.gScore + neighbor.hScore;
          neighbor.previous = current;

          if(connection.polyline){
            let tempPolyline = JSON.parse(connection.polyline)

            if(typeof tempPolyline[0] === "string"){
              tempPolyline = tempPolyline.map((hash: string) => {
                const point = ngeohash.decode(hash);

                return [point.latitude, point.longitude];
              })
            }

            neighbor.polyline = tempPolyline
          }else {
            neighbor.polyline =[] 
          }
           
          neighbor.highway = connection.highway;
          neighbor.distance = connection.distance as number;
          neighbor.travelTime = connection.travelTime as number;
        }
      }
    }

    return {
      route: [],
    };
  }
}
