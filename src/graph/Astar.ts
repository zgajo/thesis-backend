import { IOsmNode } from '../types/osm-read';

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

  const calculation =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(calculation), Math.sqrt(1 - calculation));

  const d = R * c; // in metres

  return d;
};

class SearchNode {
  node: IOsmNode;
  previous: SearchNode | null;
  gScore: number;
  fScore: number;
  hScore: number;
  visited: boolean;
  closed: boolean;

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

export class AStar {
  constructor() {}

  search(start: IOsmNode, end: IOsmNode) {
    let openedSet: SearchNode[] = [];
    let closedSet = new Map<string, boolean>();
    let path = [];
    let current;

    const startNode = new SearchNode(start);

    openedSet.push(startNode);

    while (openedSet.length) {
      // search node
      let lowestFIndex = 0;

      // openedSet should be imlemented as priority queue
      // find the node with the least f on  the open list, call it "q"
      // pop q off the open list
      for (const index in openedSet) {
        if (openedSet[index].fScore < openedSet[lowestFIndex].fScore) {
          lowestFIndex = Number(index);
        }
      }

      current = openedSet[lowestFIndex];

      if (current.node.geohash === end.geohash) {
        // console.log("Done!", current, end);
        break;
      }

      // openedSet = removeFromArray(openedSet, current.node);
      openedSet.splice(lowestFIndex, 1);
      openedSet = openedSet;

      closedSet.set(current.node.geohash as string, true);

      // generate q's 8 successors and set their parents to q
      for (const toNodeConnection of current.node.pointsToNodeSimplified || []) {
        const newSearchNode = openedSet.find((sn) => sn.node.geohash === toNodeConnection.node.geohash);

        const neighbor =
          newSearchNode || new SearchNode(toNodeConnection.node);
        const neighbortraveltime = toNodeConnection.travelTime as number;

        if (!closedSet.get(neighbor.node.geohash  as string)) {
          let tempG = current.gScore + neighbortraveltime;
          // f(n) = g(n) + f(n)
          // g(n) is the cost of the path from the start node to n,
          // h(n) is a heuristic function that estimates the cost of the cheapest path from n to the goal.

          let newPath = false;

          if (newSearchNode) {
            if (tempG < neighbor.gScore) {
              neighbor.gScore = tempG;
              newPath = true;
            }
          } else {
            newPath = true;
            neighbor.gScore = tempG;
            openedSet.push(neighbor);
          }

          // update neighbourgh only if g is better than previous one
          if (newPath) {
            neighbor.previous = current;

            neighbor.hScore = haversine(neighbor.node, end);
            neighbor.fScore = neighbor.gScore + neighbor.hScore;
          }
        }
      }
    }

    let temp = current;

    console.log("openedSet", openedSet.length);
    console.log("closedSet", closedSet.size);

    path = [temp];

    while (temp?.previous) {
      if (temp?.previous) {
        path.push(temp.previous);
        temp = temp.previous;
      }
    }

    // console.log(path);

    let distance = 0;
    let traveltime = 0;

    console.log("distance", distance);
    console.log("traveltime", traveltime);

    return {
      route: path.map((sn) => [sn?.node.lat, sn?.node.lon]) as [number,number][],
      // visitedNodes: closedSet.map((node) => ({
      //   ...node,
      //   pointsTo: (node.pointsTo as IOsmNode[]).map((p) => p.id),
      //   partOfWays: node.partOfWays.map((w) => w.id),
      // })),
    };
  }
}
