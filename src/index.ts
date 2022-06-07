import { parse } from "osm-read";
import * as path from "path";
import { ParsedNode } from "./types/osm-read";

import { COUNTRY } from "./utils/constants";
import { Parser } from "./services/parser";

const parserService = new Parser()

parse({
  filePath: path.join(__dirname, `${COUNTRY}-latest.osm.pbf`),
  endDocument: function () {
    console.log("first")
  },
  bounds: function (bounds: any) {},
  node: function(node: ParsedNode){parserService.handleNode(node)},
  way: function(way: any){ parserService.handleWay(way) },
  relation: function (relation: any) {
  },
  error: function (msg: string) {
    console.log("error: " + msg);
  },
});