import BTree from "sorted-btree";
import { SuperMap } from "../services/parser";
import { IOsmNode, IOsmWay } from "./osm-read";

export interface IOsmParsed {
  nodes: IGlobalParserDataNode;
  ways: IGlobalParserData<IOsmWay>;
  tourism: BTree<string, IOsmNode | IOsmWay>;
  historic:  BTree<string, IOsmNode | IOsmWay>;
  waterway:  BTree<string, IOsmNode | IOsmWay>;
  natural:  BTree<string, IOsmNode | IOsmWay>;
  sport:  BTree<string, IOsmNode | IOsmWay>;
}

export interface IGlobalParserData<T>{
  all: BTree<string, T>;
  highway: BTree<string, T>;
}

export interface IGlobalParserDataNode{
  all: SuperMap;
  highway: SuperMap;
}