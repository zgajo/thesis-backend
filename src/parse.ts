import { parse } from "osm-read";
import * as path from "path";

import { Parser } from "./services/parser";
import { FlatbufferHelper } from "./services/parser-flatbuffers";
import { IOsmNode } from "./types/osm-read";
import { COUNTRY } from "./utils/constants";

export const parserService = new Parser()
console.time("nodesImport")
let wayId = 1
parse({
  filePath: path.join(__dirname, `${COUNTRY}-latest.osm.pbf`),
  endDocument: function () {
    parserService.simplifyHighway()

    FlatbufferHelper.generateFlatbuffers(parserService)
    // const current = geohash.encode_int(45.111034, 13.709417, 52)
    // console.log("My current heohash encode", current)
    // console.log("My current heohash decode", geohash.decode_int(current))
    // console.log(geohash.neighbors("u218xunyu"))

    // console.log(parserService.nodes.highwayGeohash?.getAllNodes("sp91ffsv"))
    
    
    console.timeEnd("nodesImport");
    // simplify graph
    // set speed for each node connection
    // set travel time between nodes
    // console.log("*******NODES********");
    // (Object.keys(parserService.nodes) as Array<keyof typeof parserService.nodes>).forEach(nodeKey => {
    //   console.log(`${nodeKey} nodes: ${parserService.nodes[nodeKey].size}`)
    // });
    // console.log("********************");
    // console.log("*******WAYS********");
    // (Object.keys(parserService.ways) as Array<keyof typeof parserService.ways>).forEach(wayKey => {
    //   console.log(`${wayKey} way: ${parserService.ways[wayKey].size}`)
    // });
    // console.log("********************");
    // console.log("*******HISTORIC********");
    // console.log(`Historic size: ${parserService.historic.size}`)
    // console.log("********************");
    // console.log("*******TOURISM********");
    // console.log(`Tourism size: ${parserService.tourism.size}`)
    // console.log("********************");
    // console.log("******* waterway ********");
    // console.log(`waterway size: ${parserService.waterway.size}`)
    // console.log("********************");
    // console.log("******* natural ********");
    // console.log(`natural size: ${parserService.natural.size}`)
    // console.log("********************");
    // console.log("******* sport ********");
    // console.log(`sport size: ${parserService.sport.size}`)
    // console.log("********************");
  },
  bounds: function (bounds: any) {},
  node: function(node: IOsmNode){
    parserService.handleNode(node)
  },
  way: function(way: any){
    way.id = `AN${wayId}`
    parserService.handleWay(way) 
    wayId+=1
  },
  relation: function (relation: any) {
    // relation.nodeRefs = relation.members.map((member: { ref: any; }) => member.ref)
    // parserService.handleWay(relation)
  },
  error: function (msg: string) {
    console.log("error: " + msg);
  },
});