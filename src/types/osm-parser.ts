import BTree from "../trees/Btree/Btree";
import { SuperMap } from "../services/parser-storage";
import { IOsmNode, IOsmWay } from "./osm-read";

export interface IOsmParsed {
  nodes: IGlobalParserData<SuperMap, IOsmNode>;
  ways: IGlobalParserData<BTree, IOsmWay>;
  tourism: BTree<string, IOsmNode | IOsmWay>;
  historic:  BTree<string, IOsmNode | IOsmWay>;
  waterway:  BTree<string, IOsmNode | IOsmWay>;
  natural:  BTree<string, IOsmNode | IOsmWay>;
  sport:  BTree<string, IOsmNode | IOsmWay>;
  averageSpeed: number;
  speeds: {
    [key:string]: {
      count: number;
      speedAvg: number;
      totalSpeed: number;
    },
  } 
}

export interface IGlobalParserData<T, U>{
  all: T extends BTree ? BTree<string, U> : SuperMap<U>;
  highway: T extends BTree ? BTree<string, U> : SuperMap<U>;
  highwaySimplified?:  BTree<string, IOsmNode>;
}
