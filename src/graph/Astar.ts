import FastPriorityQueue from "fastpriorityqueue";
import { isForDriving } from '../services/parser-helper';
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

// https://www.movable-type.co.uk/scripts/latlong.html
export const haversine = (a: IOsmNode, b: IOsmNode) => {
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
  avgSpeed: number;
  constructor(avgSpeed: number) {
    this.avgSpeed = avgSpeed;
  }

  search(start: IOsmNode, end: IOsmNode) {
    let openSet: SearchNode[] = [new SearchNode(start)]; //array containing unevaluated grid points
    let closedSet: SearchNode[] = []; //array containing completely evaluated grid points
    let path = [];
    let current;
    let routeFound = false

    while (openSet.length > 0) {
      //assumption lowest index is the first one to begin with
      let lowestIndex = 0;
      for (let i = 0; i < openSet.length; i++) {
        if (openSet[i].fScore < openSet[lowestIndex].fScore) {
          lowestIndex = i;
        }
      }
      let current = openSet[lowestIndex];

      // kruzni koji bi trebao gledadti na 3840440595 i 625256
        // ne gleda na 3840440595
        if(current.node.id === "2287019228"){
          console.log("")
        }
        if(current.node.id === "262892997" || current.node.id === "3659845144"){
          console.log("")
        }
        if(current.node.id === "262892996" || current.node.id === "3928793758"){
          console.log("")
        }
        if(current.node.id === "5043815480"){
          console.log("")
        }
        if(current.node.id === "2287019214"){
          console.log("")
        }
        if(current.node.id === "625256"){
          console.log("")
        }
        if(current.node.id === "3840440576"){
          console.log("")
        }
        if(current.node.id === "3840440595"){
          console.log("")
        }
        if(current.node.id === "3840440610"){
          console.log("")
        }
        if(current.node.id === "3840440602"){
          console.log("")
        }
  
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
          route
        };
      }
  
      //remove current from openSet
      openSet.splice(lowestIndex, 1);
      //add current to closedSet
      closedSet.push(current);
  
      let neighbors = current.node.pointsToNodeSimplified;
      if(!neighbors) break;

      for (let i = 0; i < neighbors.length; i++) {
        const connection = neighbors[i]
        if(!isForDriving(connection.way)){
          continue
        }
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
