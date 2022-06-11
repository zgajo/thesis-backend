import polylabel from "polylabel";
import BTree from "sorted-btree";
import { Node } from "./Node";

export class Way {
  id: string;
  lat?: number;
  lon?: number;
  tags: { [key: string]: any };
  nodeRefs: string[];
  nodes: Node[];
  streetLength?: number;
  line: [number, number][];

  constructor(way: {
    id: string;
    tags: { [key: string]: any };
    nodeRefs: string[];
  }) {
    this.id = way.id;
    this.tags = way.tags;
    this.nodeRefs = way.nodeRefs;
    this.nodes = [];
    this.line = [];
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
  addLine(line: [number, number][]){
    this.line = line
  }
  setCenterOfPolygon(nodes: BTree<string, Node>){
    const polygon = this.nodeRefs.map(ref => {
      const node = nodes.get(ref)
      return [node?.lat || 0, node?.lon || 0]
    })
    var p = polylabel([polygon], 1.0);

    this.lat = p[0]
    this.lon = p[1]

  }
}
