import BTree from "sorted-btree";
import { Node } from "../trees/Node";
import { Way } from "../trees/Way";
import { ParsedNode } from "../types/osm-read";

export class Parser {
  nodes: BTree;
  ways: BTree;
  wayNodes: BTree;
  constructor() {
    this.nodes = new BTree();
    this.ways = new BTree();
    this.wayNodes = new BTree();
  }

  handleNode(node: ParsedNode) {
    this.nodes.set(node.id, new Node(node));
  }

  handleWay(way: any) {
    const newWay = new Way(way);

    newWay.nodeRefs.forEach((element: string) => {
      const wayNode = this.wayNodes.get(element);

      if (wayNode) {
        wayNode.increaseLinkCount();
        wayNode.partOfWays.push(newWay);
        newWay.addNode(wayNode);
        return;
      }
      
      const storedNode = this.nodes.get(element);

      const newNode = new Node({
        ...storedNode,
      });

      newNode.addWay(newWay);

      this.wayNodes.set(element, newNode);

      newWay.addNode(newNode);
    });

    this.ways.set(way.id, newWay);
  }
}
