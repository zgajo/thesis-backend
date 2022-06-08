import BTree from "sorted-btree";
import { Node } from "../trees/Node";
import { Way } from "../trees/Way";
import { ParsedNode } from "../types/osm-read";
import { _isPathOneWay, _isPathReversed } from "../utils/helper";

export class Parser {
  nodes: BTree;
  ways: BTree;
  wayNodes: BTree<string, Node>;
  constructor() {
    this.nodes = new BTree();
    this.ways = new BTree();
    this.wayNodes = new BTree();
  }

  handleNode(node: ParsedNode) {
    this.nodes.set(node.id, new Node(node));
  }

  handleWay(way: any) {
    const isOneWay = _isPathOneWay(way);
    if (isOneWay && _isPathReversed(way)) {
      way.nodeRefs = way.nodeRefs.reverse();
    }

    const newWay = new Way(way);

    let previousNode: Node | undefined;
    let wayLine: [number, number][] = []

    newWay.nodeRefs.forEach((element: string) => {
      const wayNode = this.wayNodes.get(element);

      if (wayNode) {
        wayNode.increaseLinkCount();
        if(previousNode){
          previousNode.connectToNode(wayNode, isOneWay)
        }
        wayNode.addWay(newWay);
        newWay.addNode(wayNode);
        
        wayLine.push([wayNode.lat, wayNode.lon])
        previousNode = wayNode
        return;
      }

      const storedNode = this.nodes.get(element);

      if(previousNode){
        previousNode.connectToNode(storedNode, isOneWay)
      }
      storedNode.addWay(newWay);
      newWay.addNode(storedNode);
      this.wayNodes.set(element, storedNode);

      wayLine.push([storedNode.lon, storedNode.lat])
      previousNode = storedNode
    });

    newWay.addLine(wayLine)
    this.ways.set(way.id, newWay);
  }
  _handleWayNodes(way: Way) {
    return;
  }
}
