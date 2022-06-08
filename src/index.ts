import { parse } from "osm-read";
import * as path from "path";
import { ParsedNode } from "./types/osm-read";

import { COUNTRY } from "./utils/constants";
import { Parser } from "./services/parser";

const parserService = new Parser()
console.time("nodesImport")
let timerOn = true
parse({
  filePath: path.join(__dirname, `${COUNTRY}-latest.osm.pbf`),
  endDocument: function () {
    // simplify graph
    // set speed for each node connection
    // set travel time between nodes
    const a = parserService.wayNodes.get("535387288")
    console.log("first")
  },
  bounds: function (bounds: any) {},
  node: function(node: ParsedNode){parserService.handleNode(node)},
  way: function(way: any){ 
    if(timerOn){
      console.timeEnd("nodesImport");
      timerOn = false
    }
  parserService.handleWay(way) },
  relation: function (relation: any) {
  },
  error: function (msg: string) {
    console.log("error: " + msg);
  },
});