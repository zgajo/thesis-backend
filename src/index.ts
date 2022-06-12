import { parse } from "osm-read";
import * as path from "path";

import { COUNTRY } from "./utils/constants";
import { Parser } from "./services/parser";
import { IOsmNode } from "./types/osm-read";

const parserService = new Parser()
console.time("nodesImport")

class SuperMap {
	maps: Array<Map<string, IOsmNode>>

	constructor() {
		this.maps = [new Map()]
	}

	set(node: IOsmNode) {
		if (this.maps[this.maps.length-1].size === 16777000) this.maps.push(new Map())
		return this.maps[this.maps.length-1].set(node.id, node)
	}

	get(v: string) {
		for (const map of this.maps) {
			if (map.get(v)) return true
		}
		return false;
	}
}

parse({
  filePath: path.join(__dirname, `${COUNTRY}-latest.osm.pbf`),
  endDocument: function () {
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
    parserService.handleWay(way) 
  },
  relation: function (relation: any) {
    // relation.nodeRefs = relation.members.map((member: { ref: any; }) => member.ref)
    // parserService.handleWay(relation)
  },
  error: function (msg: string) {
    console.log("error: " + msg);
  },
});