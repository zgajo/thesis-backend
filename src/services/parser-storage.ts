import BTree from "../trees/Btree/Btree";
import { GeoTree } from "../trees/GeoTree/GeoTree";
import { IGlobalParserData, IOsmParsed } from "../types/osm-parser";
import { IOsmNode, IOsmWay } from "../types/osm-read";
import { GEOHASH_PRECISION } from "../utils/constants";

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

export class ParserStorage implements IOsmParsed {
  nodes: IGlobalParserData<SuperMap, IOsmNode>;
  ways: IGlobalParserData<BTree, IOsmWay>;
  tourism: BTree<string, IOsmNode | IOsmWay>;
  historic: BTree<string, IOsmNode | IOsmWay>;
  waterway: BTree<string, IOsmNode | IOsmWay>;
  natural: BTree<string, IOsmNode | IOsmWay>;
  sport: BTree<string, IOsmNode | IOsmWay>;
  speeds;
  averageSpeed;

  constructor() {
    this.ways = {
      all: new BTree(),
      highway: new BTree(),
    };
    this.nodes = {
      all: new SuperMap(),
      highway: new SuperMap(),
      highwaySimplified: new BTree<string, IOsmNode>(),
      highwayGeohash: new GeoTree(GEOHASH_PRECISION),
    };
    this.historic = new BTree();
    this.tourism = new BTree();
    this.waterway = new BTree();
    this.natural = new BTree();
    this.sport = new BTree();
    this.speeds = {};
    this.averageSpeed = 0;
  }
}
