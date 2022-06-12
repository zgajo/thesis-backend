import polylabel from "polylabel";
import BTree from "../trees/Btree/Btree";
import { IGlobalParserData, IOsmParsed } from "../types/osm-parser";
import { IOsmNode, IOsmWay, TPointsToNode } from "../types/osm-read";
import { greatCircleVec } from "../utils/distance";

import { _isPathOneWay, _isPathReversed } from "../utils/helper";

export class SuperMap<T = any> {
  maps: Array<Map<string, T>>;

  constructor() {
    this.maps = [new Map()];
  }

  set(id: string, node: T) {
    if (this.maps[this.maps.length - 1].size === 16777000) this.maps.push(new Map());
    return this.maps[this.maps.length - 1].set(id, node);
  }

  get(v: string) {
    let element = null
    for (const map of this.maps) {
      element = map.get(v)
      if (element) return element;
    }
    return element;
  }

  get size(){
    let size = 0
    for (const map of this.maps) {
      size += map.size
    }
    return size
  }
}

const globalWays: IGlobalParserData<BTree, IOsmWay> = {
  all: new BTree(),
  highway: new BTree(),
};
const globalNodes: IGlobalParserData<SuperMap, IOsmNode> = {
  all: new SuperMap(),
  highway: new SuperMap(),
};

function WayParser<TBase extends new (...args: any[]) => IOsmParsed>(Base: TBase) {
  return class WayParser extends Base {
    handleWay(way: IOsmWay) {
      this.ways.all.set(way.id, way);
      switch (true) {
        case !!way.tags?.highway:
          return this.highwayHandler(way);
        case !!way.tags?.tourism:
          return this.tourismHandler(way);
        case !!way.tags?.historic:
          return this.historicHandler(way);
        case !!way.tags?.waterway:
          return this.waterwayHandler(way);
        case !!way.tags?.natural:
          return this.naturalHandler(way);
        case !!way.tags?.sport:
          return this.sportHandler(way);

        // accomodation
        // cafe and restoraunt
        // charging station
        // store
        // emergency
        // filling station
        // finance
        // food
        // leisure
        // nautical
        // parking
        // sightseeing
        // sports
        // tourism
        default:
          return way;
      }
    }

    private highwayHandler(way: IOsmWay) {
      const isOneWay = _isPathOneWay(way);
      if (isOneWay && _isPathReversed(way)) {
        way.nodeRefs = way.nodeRefs.reverse();
      }

      let previousNode: IOsmNode | undefined;
      // let wayLine: [number, number][] = [];
      // const nodeRefsLength = way.nodeRefs.length
      // let line = ""
      way.nodeRefs.forEach((element: string, index) => {
        const highwayNode = this.nodes.highway.get(element);
        
        if (highwayNode) {
          NodeHelper.increaseLinkCount(highwayNode);
          if (previousNode) {
            NodeHelper.connectNodes(previousNode, highwayNode, way.tags?.highway, isOneWay, way);
          }
          // NodeHelper.addWay(highwayNode, way);
          // WayHelper.addNode(way, highwayNode);

          // line += `${highwayNode.lon}, ${highwayNode.lat}`
          // if (index !== nodeRefsLength - 1) {
          //   line += ", ";
          // }

          // wayLine.push([highwayNode.lat, highwayNode.lon]);
          previousNode = highwayNode;
          return;
        }

        const node = this.nodes.all.get(element);

        if (node) {
          if (previousNode) {
            NodeHelper.connectNodes(previousNode, node, way.tags?.highway, isOneWay, way);
          }
          // NodeHelper.addWay(node, way);
          // WayHelper.addNode(way, node);
          this.nodes.highway.set(element, node);

          // line += `${node.lon}, ${node.lat}`
          // if (index !== nodeRefsLength - 1) {
          //   line += ", ";
          // }

          // wayLine.push([node.lon, node.lat]);
          previousNode = node;
        }
      });

      // way.geometry = `LINESTRING (${line})`;

      this.ways.highway.set(way.id, way);
      return way;
    }

    private tourismHandler(way: IOsmWay) {
      WayHelper.setCenterOfPolygon(way, this.nodes.all);
      this.tourism.set(way.id, way);
    }

    private historicHandler(way: IOsmWay) {
      WayHelper.setCenterOfPolygon(way, this.nodes.all);
      this.historic.set(way.id, way);
    }

    private waterwayHandler(way: IOsmWay) {
      WayHelper.setCenterOfPolygon(way, this.nodes.all);
      this.waterway.set(way.id, way);
    }

    private naturalHandler(way: IOsmWay) {
      WayHelper.setCenterOfPolygon(way, this.nodes.all);
      this.natural.set(way.id, way);
    }

    private sportHandler(way: IOsmWay) {
      WayHelper.setCenterOfPolygon(way, this.nodes.all);
      this.sport.set(way.id, way);
    }
  };
}


function NodeParser<TBase extends new (...args: any[]) => IOsmParsed>(Base: TBase) {
  return class NodeParser extends Base {
    handleNode(node: any) {
      this.nodes.all.set(node.id, node);

      switch (true) {
        case !!node.tags.tourism:
          return this.tourism.set(node.id, node);
        case !!node.tags.historic:
          return this.historic.set(node.id, node);
        case !!node.tags.waterway:
          return this.waterway.set(node.id, node);
        case !!node.tags.natural:
          return this.natural.set(node.id, node);
        case !!node.tags.sport:
          return this.sport.set(node.id, node);
        default:
          return node;
      }
    }
  };
}

class NodeHelper {
  static increaseLinkCount(node: IOsmNode) {
    if (!node.linkCount) node.linkCount = 0;
    if (!node.street_count) node.street_count = 0;
    node.linkCount += 1;
    node.street_count += 1;
  }

  static connectNodes(previous: IOsmNode, next: IOsmNode, highway: string = "", oneWay: boolean = false, way: IOsmWay) {
    const distance: number = greatCircleVec(previous.lat, previous.lon, next.lat, next.lon);

    const previousPointsToNode: TPointsToNode = [
      next.id,
      next, 
      highway, 
      distance,
      way
    ]

    previous.pointsToNode 
      ? previous.pointsToNode.push(previousPointsToNode) 
      : (previous.pointsToNode = [previousPointsToNode]);
    if (!oneWay) {
      const nextPointsToNode: TPointsToNode = [
        next.id,
        next, 
        highway, 
        distance,
        way
      ]
      next.pointsToNode 
        ? next.pointsToNode.push(nextPointsToNode) 
        : (next.pointsToNode = [nextPointsToNode]);
    }
  }
}

class WayHelper {
  static addNode(way: IOsmWay, node: IOsmNode) {
    way.nodes ? way.nodes.push(node) : (way.nodes = [node]);
  }
  static setCenterOfPolygon(way: IOsmWay, nodes: SuperMap) {
    const polygon = way.nodeRefs.map(ref => {
      const node = nodes.get(ref);
      return [node?.lat || 0, node?.lon || 0];
    });
    var p = polylabel([polygon], 1.0);

    way.lat = p[0];
    way.lon = p[1];
  }
}

class ParserStorage implements IOsmParsed {
  nodes: typeof globalNodes;
  ways: typeof globalWays;
  tourism: BTree<string, IOsmNode | IOsmWay>;
  historic: BTree<string, IOsmNode | IOsmWay>;
  waterway: BTree<string, IOsmNode | IOsmWay>;
  natural: BTree<string, IOsmNode | IOsmWay>;
  sport: BTree<string, IOsmNode | IOsmWay>;

  constructor() {
    this.ways = globalWays;
    this.nodes = globalNodes;
    this.historic = new BTree();
    this.tourism = new BTree();
    this.waterway = new BTree();
    this.natural = new BTree();
    this.sport = new BTree();
  }
}

const Parser = NodeParser(WayParser(ParserStorage));

export { Parser };
