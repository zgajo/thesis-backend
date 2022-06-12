import BTree from "sorted-btree";
import { IGlobalParserData, IGlobalParserDataNode, IOsmParsed } from "../types/osm-parser";
import { IOsmNode, IOsmWay } from "../types/osm-read";

export class SuperMap {
  maps: Array<Map<string, IOsmNode>>;

  constructor() {
    this.maps = [new Map()];
  }

  set(id: string, node: IOsmNode) {
    if (this.maps[this.maps.length - 1].size === 16777000) this.maps.push(new Map());
    return this.maps[this.maps.length - 1].set(id, node);
  }

  get(v: string) {
    let element = null;
    for (const map of this.maps) {
      element = map.get(v);
      if (element) return element;
    }
    return element;
  }

  get size() {
    let size = 0;
    for (const map of this.maps) {
      size += map.size;
    }
    return size;
  }
}

const globalWays: IGlobalParserData<IOsmWay> = {
  all: new BTree(),
  highway: new BTree(),
};
const globalNodes: IGlobalParserDataNode = {
  all: new SuperMap(),
  highway: new SuperMap(),
};

export class ParserStorage implements IOsmParsed {
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
