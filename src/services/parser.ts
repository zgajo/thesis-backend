import geohash from "ngeohash";
import { haversine } from "../graph/Astar";
import { IOsmParsed } from "../types/osm-parser";
import { IOsmNode, IOsmWay, TPointsToNode } from "../types/osm-read";
import { GEOHASH_PRECISION } from "../utils/constants";
import { _isPathOneWay, _isPathReversed } from "../utils/helper";
import { isForDriving, isForWalking, isWayToNavigate, NodeHelper, speedTransformer, WayHelper } from "./parser-helper";
import { ParserStorage } from "./parser-storage";

function WayParser<TBase extends new (...args: any[]) => IOsmParsed>(Base: TBase) {
  return class WayParser extends Base {
    handleWay(way: IOsmWay) {
      this.ways.all.set(way.id, way);
      switch (true) {
        case isWayToNavigate(way):
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
        default:
          return way;
      }
    }

    private highwayHandler(way: IOsmWay) {
      const isOneWay = _isPathOneWay(way);
      if (isOneWay && _isPathReversed(way)) {
        way.nodeRefs = way.nodeRefs.reverse();
      }

      const maxspeed = speedTransformer(way.tags?.maxspeed, way);

      const highway = way.tags?.highway as string;
      const roadSpeed = this.speeds[highway];

      if (roadSpeed && maxspeed) {
        roadSpeed.count += 1;
        roadSpeed.totalSpeed += maxspeed;
      } else if (maxspeed) {
        const speed = {
          count: 1,
          totalSpeed: maxspeed,
          speedAvg: 0,
        };
        this.speeds[highway] = speed;
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
          WayHelper.addNode(way, highwayNode);

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
          NodeHelper.increaseLinkCount(node);
          if (previousNode) {
            NodeHelper.connectNodes(previousNode, node, way.tags?.highway, isOneWay, way);
          }
          // NodeHelper.addWay(node, way);
          WayHelper.addNode(way, node);
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
      if (way.lat && way.lon) {
        way.geohash = geohash.encode(way.lat, way.lon, GEOHASH_PRECISION);
        this.geotreeElements.insert(way.geohash, way);
      }
      this.tourism.set(way.id, way);
    }

    private historicHandler(way: IOsmWay) {
      WayHelper.setCenterOfPolygon(way, this.nodes.all);
      if (way.lat && way.lon) {
        way.geohash = geohash.encode(way.lat, way.lon, GEOHASH_PRECISION);
        this.geotreeElements.insert(way.geohash, way);
      }
      this.historic.set(way.id, way);
    }

    private waterwayHandler(way: IOsmWay) {
      WayHelper.setCenterOfPolygon(way, this.nodes.all);
      if (way.lat && way.lon) {
        way.geohash = geohash.encode(way.lat, way.lon, GEOHASH_PRECISION);
        this.geotreeElements.insert(way.geohash, way);
      }
      this.waterway.set(way.id, way);
    }

    private naturalHandler(way: IOsmWay) {
      WayHelper.setCenterOfPolygon(way, this.nodes.all);
      if (way.lat && way.lon) {
        way.geohash = geohash.encode(way.lat, way.lon, GEOHASH_PRECISION);
        this.geotreeElements.insert(way.geohash, way);
      }
      this.natural.set(way.id, way);
    }

    private sportHandler(way: IOsmWay) {
      WayHelper.setCenterOfPolygon(way, this.nodes.all);
      if (way.lat && way.lon) {
        way.geohash = geohash.encode(way.lat, way.lon, GEOHASH_PRECISION);
        this.geotreeElements.insert(way.geohash, way);
      }
      this.sport.set(way.id, way);
    }

    calculateAverageSpeed() {
      Object.entries(this.speeds).forEach(([key, value]) => {
        const roadAvgSpeed = value.totalSpeed / value.count;
        this.speeds[key].speedAvg = roadAvgSpeed;
        this.averageSpeed = (this.averageSpeed + roadAvgSpeed) / 2;
      });
    }

    simplifyHighway() {
      this.calculateAverageSpeed();

      this.ways.highway.forEach(way => {
        const isOneWay = _isPathOneWay(way);

        if (way.nodeRefs) {
          const lastIndex = way.nodeRefs.length - 1;

          let startingCalculationNode = this.nodes.highway.get(way.nodeRefs[0]);
          let distance = 0;

          if (!startingCalculationNode) throw new Error(`startingCalculationNode: ${startingCalculationNode} not found in highway nodes`);
          const startingCalculationNodeGeohash = geohash.encode(startingCalculationNode.lat, startingCalculationNode.lon, GEOHASH_PRECISION)
          let polyline: string[] = [startingCalculationNodeGeohash];

          for (let i = 1; i <= lastIndex; i++) {
            const previousNode = this.nodes.highway.get(way.nodeRefs[i - 1]);
            const node = this.nodes.highway.get(way.nodeRefs[i]);
            if (!previousNode || !node) throw new Error(`previousNode: ${previousNode} or node: ${node} not found in highway nodes`);

            const response = this.simplifyNodesCleaner(
              way,
              previousNode,
              node,
              i === lastIndex,
              distance,
              startingCalculationNode,
              isOneWay,
              polyline,
            );

            if (response) {
              distance = response.distance;
              startingCalculationNode = response.startingCalculationNode;
              polyline = response.polyline;
            }
          }
        }
      });
    }

    private simplifyNodesCleaner(
      way: IOsmWay,
      previousNode: IOsmNode,
      nextNode: IOsmNode,
      lastIndex: boolean,
      distance: number,
      startingCalculationNode: IOsmNode,
      isOneWay: boolean,
      polyline: string[],
    ) {
      const holdNode = (nextNode.linkCount && nextNode.linkCount > 1) || lastIndex;
      const nextNodeGeohahs = geohash.encode(nextNode.lat, nextNode.lon)
      polyline.push(nextNodeGeohahs);
      distance += haversine(previousNode, nextNode);

      if (!previousNode.pointsToNode) return;

      const connectionNode = previousNode.pointsToNode.find(connectionNode => connectionNode.nodeId === nextNode.id);
      if (!connectionNode) return;

      // we've hit the node that needs to be stored
      if (holdNode) {
        const { travelTime, speed } = this.calculateTravelTime(way, distance);

        const newConnection: TPointsToNode = {
          nodeId: nextNode.id,
          node: nextNode,
          highway: way.tags?.highway || "",
          distance,
          way,
          polyline: JSON.stringify(polyline),
          travelTime,
          speed,
          wayId:way.id,
          oneWay: isOneWay
        };

        this.simplifyNodesConnector(startingCalculationNode, nextNode, newConnection, isOneWay);

        if (!startingCalculationNode.geohash) {
          const hash = geohash.encode(startingCalculationNode.lat, startingCalculationNode.lon, GEOHASH_PRECISION);
          this.nodes.highwayGeohash?.insert(hash, startingCalculationNode);
          startingCalculationNode.geohash = hash;
        }
        if (!nextNode.geohash) {
          const hash = geohash.encode(nextNode.lat, nextNode.lon, GEOHASH_PRECISION);
          this.nodes.highwayGeohash?.insert(hash, nextNode);
          nextNode.geohash = hash;
        }

        startingCalculationNode = nextNode;
        polyline = [nextNode.geohash];
        distance = 0;
      }
      return {
        startingCalculationNode,
        polyline,
        distance,
      };
    }

    simplifyNodesConnector(startingCalculationNode: IOsmNode, nextNode: IOsmNode, newConnection: TPointsToNode, isOneWay: boolean) {
      const startingCalculationNodeSimplified = this.nodes.highwaySimplified?.get(startingCalculationNode.id);

      // const connectionData = FlatbufferHelper.nodesConnectorData(

      // );

      // const startingCalculationNodeSimplifiedConnection = FlatbufferHelper.nodesConnector(newConnection.node.geohash as string, connectionData);

      if (startingCalculationNodeSimplified) {
        (startingCalculationNodeSimplified.pointsToNodeSimplified || []).push(newConnection);
        startingCalculationNodeSimplified.flatbuffersPointsToNode?.push();
      } else {
        startingCalculationNode.pointsToNodeSimplified = [newConnection];
        this.nodes.highwaySimplified?.set(startingCalculationNode.id, startingCalculationNode);
        // startingCalculationNode.flatbuffersPointsToNode = [startingCalculationNodeSimplifiedConnection];
      }

      if (!isOneWay) {
        const nextNodeSimplified = this.nodes.highwaySimplified?.get(nextNode.id);
        const reversedConnection: TPointsToNode = {
          ...newConnection,
          nodeId: startingCalculationNode.id,
          node: startingCalculationNode,
          polyline: JSON.stringify((JSON.parse(newConnection.polyline || "") as [number, number][]).reverse()),
        };

        // const nextNodeSimplifiedConnection = FlatbufferHelper.nodesConnector(reversedConnection.node.geohash as string, connectionData);

        if (nextNodeSimplified) {
          (nextNodeSimplified.pointsToNodeSimplified || []).push(reversedConnection);
          this.nodes.highwaySimplified?.set(nextNode.id, nextNode);
          // nextNode.flatbuffersPointsToNode = [nextNodeSimplifiedConnection];
        } else {
          nextNode.pointsToNodeSimplified = [reversedConnection];
          this.nodes.highwaySimplified?.set(nextNode.id, nextNode);
        }
      }
    }

    calculateTravelTime(way: IOsmWay, distance: number) {
      const distanceKm = distance / 1000;

      let maxspeed = speedTransformer(way.tags?.maxspeed, way);

      if (!maxspeed) {
        if(isForWalking(way) && !isForDriving(way)){
          maxspeed = 6
        }else {
          maxspeed = this.speeds[way.tags?.highway as string]?.speedAvg || this.averageSpeed;
        }
      }

      const speedKmSec = maxspeed / (60 * 60);

      const travelTime = parseFloat(Number(distanceKm / speedKmSec).toFixed(1));

      return { travelTime, speed: maxspeed };
    }
  };
}

function NodeParser<TBase extends new (...args: any[]) => IOsmParsed>(Base: TBase) {
  return class NodeParser extends Base {
    handleNode(node: any) {
      this.nodes.all.set(node.id, node);

      switch (true) {
        case !!node.tags.tourism:
          node.geohash = geohash.encode(node.lat, node.lon, GEOHASH_PRECISION);
          this.geotreeElements.insert(node.geohash, node);
          return this.tourism.set(node.id, node);
        case !!node.tags.historic:
          node.geohash = geohash.encode(node.lat, node.lon, GEOHASH_PRECISION);
          this.geotreeElements.insert(node.geohash, node);
          return this.historic.set(node.id, node);
        case !!node.tags.waterway:
          node.geohash = geohash.encode(node.lat, node.lon, GEOHASH_PRECISION);
          this.geotreeElements.insert(node.geohash, node);
          return this.waterway.set(node.id, node);
        case !!node.tags.natural:
          node.geohash = geohash.encode(node.lat, node.lon, GEOHASH_PRECISION);
          this.geotreeElements.insert(node.geohash, node);
          return this.natural.set(node.id, node);
        case !!node.tags.sport:
          node.geohash = geohash.encode(node.lat, node.lon, GEOHASH_PRECISION);
          this.geotreeElements.insert(node.geohash, node);
          return this.sport.set(node.id, node);
        default:
          return node;
      }
    }
  };
}

const Parser = NodeParser(WayParser(ParserStorage));

export { Parser };
