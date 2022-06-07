import { Node } from "./Node";

export class Way {
  id: string;
  tags: { [key: string]: any };
  nodeRefs: string[];
  nodes: Node[];
  streetLength?: number;

  constructor(way: {
    id: string;
    tags: { [key: string]: any };
    nodeRefs: string[];
  }) {
    this.id = way.id;
    this.tags = way.tags;
    this.nodeRefs = way.nodeRefs;
    this.nodes = [];
  }

  addNode(node: Node) {
    this.nodes.push(node);
  }

  deleteNode(nodeId: string) {
    this.nodeRefs = this.nodeRefs.filter((id) => id !== nodeId);
    this.nodes = this.nodes.filter(({ id }) => id !== nodeId);
  }

  setStreetLength(length: number){
    this.streetLength = length
  }
}