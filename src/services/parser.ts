import BTree from "sorted-btree";
import { Node } from "../trees/Node";
import { Way } from "../trees/Way";
import { ParsedNode } from "../types/osm-read";
import { _isPathOneWay, _isPathReversed } from "../utils/helper";


const globalWaysObject = {
  all: new BTree(),
  highway: new BTree(),
}
const globalNodesObject = {
  all: new BTree(),
  highway: new BTree(),
}
interface OsmParsed {
  nodes: typeof globalNodesObject;
  ways: typeof globalWaysObject;
  tourism: BTree<string, Node | Way>;
  historic:  BTree<string, Node | Way>;
  waterway:  BTree<string, Node | Way>;
  natural:  BTree<string, Node | Way>;
  sport:  BTree<string, Node | Way>;
}


function WayParser<TBase extends new (...args: any[]) => OsmParsed>(Base: TBase) {
  return class WayParser extends Base {
    handleWay(way: Way){
      const newWay = new Way(way);
      this.ways.all.set(way.id, newWay);
      switch (true) {
        case !!way.tags.highway:
          return this.highwayHandler(newWay);
        case !!way.tags.tourism:
          return this.tourismHandler(newWay);
        case !!way.tags.historic:
          return this.historicHandler(newWay);
        case !!way.tags.waterway:
          return this.waterwayHandler(newWay);
        case !!way.tags.natural:
          return this.naturalHandler(newWay);
        case !!way.tags.sport:
          return this.sportHandler(newWay);
          
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
  
    private highwayHandler(way: Way){
      const isOneWay = _isPathOneWay(way);
      if (isOneWay && _isPathReversed(way)) {
        way.nodeRefs = way.nodeRefs.reverse();
      }
  
      let previousNode: Node | undefined;
      let wayLine: [number, number][] = []
  
      way.nodeRefs.forEach((element: string) => {
        const wayNode = this.nodes.highway.get(element);
  
        if (wayNode) {
          wayNode.increaseLinkCount();
          if(previousNode){
            previousNode.connectToNode(wayNode, way.tags?.highway, isOneWay)
          }
          wayNode.addWay(way);
          way.addNode(wayNode);
  
          wayLine.push([wayNode.lat, wayNode.lon])
          previousNode = wayNode
          return;
        }
  
        const storedNode = this.nodes.all.get(element);
  
        if(storedNode){
          if(previousNode){
            previousNode.connectToNode(storedNode, way.tags?.highway, isOneWay)
          }
          storedNode.addWay(way);
          way.addNode(storedNode);
          this.nodes.highway.set(element, storedNode);
          
          wayLine.push([storedNode.lon, storedNode.lat])
          previousNode = storedNode
        }
      });
      
      way.addLine(wayLine)
  
      this.ways.highway.set(way.id, way)
      return way
    }
  
    private tourismHandler(way:Way){
      way.setCenterOfPolygon(this.nodes.all)
      this.tourism.set(way.id, way)
    }
  
    private historicHandler(way:Way){
      way.setCenterOfPolygon(this.nodes.all)
      this.historic.set(way.id, way)
    }
  
    private waterwayHandler(way:Way){
      way.setCenterOfPolygon(this.nodes.all)
      this.waterway.set(way.id, way)
    }
  
    private naturalHandler(way:Way){
      way.setCenterOfPolygon(this.nodes.all)
      this.natural.set(way.id, way)
    }
  
    private sportHandler(way:Way){
      way.setCenterOfPolygon(this.nodes.all)
      this.sport.set(way.id, way)
    }
  };
}

function NodeParser<TBase extends new (...args: any[]) => OsmParsed>(Base: TBase) {
  return class NodeParser extends Base {
    handleNode(node: any){
      const newNode = new Node(node)
      this.nodes.all.set(node.id, newNode)

      switch (true) {
        case !!node.tags.tourism:
          return this.tourism.set(newNode.id, newNode);
        case !!node.tags.historic:
          return this.historic.set(newNode.id, newNode);
        case !!node.tags.waterway:
          return this.waterway.set(newNode.id, newNode);
        case !!node.tags.natural:
          return this.natural.set(newNode.id, newNode);
        case !!node.tags.sport:
          return this.sport.set(newNode.id, newNode);
        default:
          return newNode;
      }
    }
  };
}




class ParserStorage implements OsmParsed {
  nodes: typeof globalNodesObject;
  ways: typeof globalWaysObject;
  tourism: BTree<string, Node | Way>;
  historic:  BTree<string, Node | Way>;
  waterway:  BTree<string, Node | Way>;
  natural:  BTree<string, Node | Way>;
  sport:  BTree<string, Node | Way>;
  
  constructor(){
    this.ways = globalWaysObject
    this.nodes = globalNodesObject
    this.historic = new BTree()
    this.tourism = new BTree()
    this.waterway = new BTree()
    this.natural = new BTree()
    this.sport = new BTree()
  }
}

const Parser = NodeParser(WayParser(ParserStorage))

export {
  Parser,
}