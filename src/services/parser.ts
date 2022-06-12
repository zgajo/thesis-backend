import { IOsmParsed } from "../types/osm-parser";
import { IOsmNode, IOsmWay } from "../types/osm-read";
import { _isPathOneWay, _isPathReversed } from "../utils/helper";
import { NodeHelper, WayHelper } from "./parser-helper";
import { ParserStorage } from "./parser-storage";


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


const Parser = NodeParser(WayParser(ParserStorage));

export { Parser };
