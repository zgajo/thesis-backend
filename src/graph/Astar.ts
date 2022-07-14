import FastPriorityQueue from "fastpriorityqueue";
import { isForBike, isForDriving, isForWalking } from '../services/parser-helper';
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

type Position = {lat: number, lon: number}
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
  polyline?: [number, number][];

  constructor(node: IOsmNode) {
    this.gScore = 0;
    this.fScore = 0;
    this.hScore = 0;
    this.node = node;
    this.previous = null;
    this.visited = false;
    this.closed = false;
  }
}

function removeFromArray(arr: SearchNode[], el: IOsmNode) {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i].node == el) {
      arr.splice(i, 1);
    }
  }

  return arr;
}

class PriorityQueue {
  private queue: SearchNode[];
  constructor() {
    this.queue = [];
  }

  add(node: SearchNode) {
    this.queue.push(node);
    this.queue.sort((a, b) => {
      if (a.fScore < b.fScore) return -1;
      else if (a.fScore > b.fScore) return 1;
      return 0;
    });
  }

  dequeue() {
    const first = this.queue.shift();
    return first;
  }

  isEmpty() {
    return this.queue.length;
  }

  find(searchNode: TPointsToNode) {
    return this.queue.find(sn => {
      if (sn.node.geohash === searchNode.node.geohash) {
        return sn;
      }
    });
  }

  get size() {
    return this.queue.length;
  }
}
export class AStar {
  private avgSpeed: number;
  private disabledEdges: Map<string, boolean>;
  constructor(avgSpeed: number) {
    this.avgSpeed = avgSpeed;
    this.disabledEdges = new Map()
  }

  addDisabledEdge(from: string, to: string){
    this.disabledEdges.set(`${from}-${to}`, true)
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
        let route: [number, number][][] = []
        while (temp.previous) {
          path.push(temp.previous);
          if(temp.polyline){
            route.push(temp.polyline)
          }
          temp = temp.previous;
        }
        console.log("DONE!");
        console.log("openSet!", openSet.length);
        console.log("closedSet!", closedSet.length);
        // return the traced path
        return {
          route,
          current
        };
      }
  
      //remove current from openSet
      openSet.splice(lowestIndex, 1);
      //add current to closedSet
      closedSet.push(current);
  
     
      let neighbors = current.node.pointsToNodeSimplified;

       // 3378259472 mi je povezan ali speed je 6???...
       // footway ima brzinu 31???
       if(current.node.id === "3378259468"){
        console.log("first")
      }
      if(!neighbors) break;

      for (let i = 0; i < neighbors.length; i++) {
        const connection = neighbors[i]
        // const skipEdge = this.disabledEdges.get(`${current.node.geohash}-${connection.node.geohash}`) || this.disabledEdges.get(`${connection.node.geohash}-${current.node.geohash}`)
        
        // if(skipEdge) continue

        // if(isForWalking(connection.way)){
        //   continue
        // }
        let neighbor = new SearchNode(neighbors[i].node);
  
        if (!closedSet.find(n => n.node.id === connection.nodeId)) {
          let penalty = 0;
          if(current.highway){
            penalty = getPenaltyTransition(current.highway, connection.highway)
          }
          let possibleG = current.gScore + (connection.travelTime as number) + penalty;
  
          if (!openSet.find(n => n.node.id === connection.nodeId)) {
            openSet.push(neighbor);
          } else if (possibleG >= neighbor.gScore) {
            continue;
          }
  
          const heuristicNeighbourghToEnd = greatCircleVec(neighbor.node.lat, neighbor.node.lon, end.lat, end.lon)
          neighbor.gScore = possibleG;
          neighbor.hScore = calculateTravelTime(this.avgSpeed, heuristicNeighbourghToEnd);
          neighbor.fScore = neighbor.gScore + neighbor.hScore;
          neighbor.previous = current;
          neighbor.polyline = connection.polyline ? JSON.parse(connection.polyline) : [];
          neighbor.highway = connection.highway;
        }
      }

    }
    
    return {
      route: []
    }
  }
}
