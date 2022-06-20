import * as flatbuffers from "flatbuffers";
import * as fs from "fs"
import BTree from "../trees/Btree/Btree";
import { GeoTree, GeoTreeBox } from "../trees/GeoTree/GeoTree";
import { IOsmNode } from "../types/osm-read";
import { COUNTRY } from "../utils/constants";
import * as OSM from "../utils/flatbuffers/osm";
import { DataTable } from "../utils/flatbuffers/osm/parser/data-table";
import {Parser} from './parser'

let builder = new flatbuffers.Builder(1024);



export class FlatbufferHelper {
  static nodesConnectorData(distance: number, highway: string, polyline: string, travelTime: number) {
    const highwayEncoded = builder.createString(highway);
    const polylineEncoded = builder.createString(polyline);

    OSM.OsmNodesConnectionData.startOsmNodesConnectionData(builder);
    OSM.OsmNodesConnectionData.addDistance(builder, distance);
    OSM.OsmNodesConnectionData.addHighway(builder, highwayEncoded);
    OSM.OsmNodesConnectionData.addPolyline(builder, polylineEncoded);
    OSM.OsmNodesConnectionData.addTravelTime(builder, travelTime);

    return OSM.OsmNodesConnectionData.endOsmNodesConnectionData(builder);
  }
  static nodesConnector(nodeId: string, data: number) {
    const nodeIdEncoded = builder.createString(nodeId);

    OSM.OsmNodesConnection.startOsmNodesConnection(builder);
    OSM.OsmNodesConnection.addData(builder, data);
    OSM.OsmNodesConnection.addNodeId(builder, nodeIdEncoded);

    return OSM.OsmNodesConnection.endOsmNodesConnection(builder);
  }

  static generateFlatbuffers(parserService: InstanceType<typeof Parser>){    
    const geohashHighwayTable = FlatbufferHelper.generateFlatbuffersHighway(parserService.nodes.highwayGeohash)
    DataTable.startDataTable(builder)
    if(geohashHighwayTable) DataTable.addGeohashHighwayNodes(builder, geohashHighwayTable)
    const dataTable = DataTable.endDataTable(builder)

    builder.finish(dataTable)
    let buf = builder.asUint8Array(); // Of type `Uint8Array`.
    fs.writeFileSync(`${COUNTRY}-flatbuffers.bin`, buf, 'binary');
  }

  static generateFlatbuffersHighway(geoTree: GeoTree | undefined) {
    // root
    if (!geoTree) return;

    const data = geoTree.data.map(FlatbufferHelper.handleGeoTreeBox);
    const dataVector = OSM.GeohashTreeBox.createDataVector(builder, data);
    OSM.GeohashTree.startGeohashTree(builder);
    OSM.GeohashTree.addData(builder, dataVector);
    OSM.GeohashTree.addPrecision(builder, geoTree?.precision);
    const geohashHighwayTable = OSM.GeohashTree.endGeohashTree(builder)
    geoTree.flatbuffered = geohashHighwayTable

    return geohashHighwayTable
  }

  static handleGeoTreeBox(box: GeoTreeBox): number {
    // inner box
    if (box.data?.length && !box.values?.length) {
      const key = builder.createString(box.key);

      const data = box.data.map(FlatbufferHelper.handleGeoTreeBox);
      const dataVector = OSM.GeohashTreeBox.createDataVector(builder, data);

      OSM.GeohashTreeBox.startGeohashTreeBox(builder);
      OSM.GeohashTreeBox.addKey(builder, key);
      OSM.GeohashTreeBox.addData(builder, dataVector);

      box.flatbuffered = OSM.GeohashTreeBox.endGeohashTreeBox(builder);
      return box.flatbuffered;
    }
    // leaf box  (box.values?.length && !box.data?.length)
    else {
      const leafBox = FlatbufferHelper.handleGeohashLeaf(box);
      return leafBox;
    }
  }

  static handleGeohashLeaf(box: GeoTreeBox) {
    const key = builder.createString(box.key);

    const values = box.values.map(node => {
      const id = builder.createString(node.geohash);
      let pointsTo;
      if (node.flatbuffersPointsToNode) {
        pointsTo = OSM.OsmNode.createPointsToVector(builder, node.flatbuffersPointsToNode);
      }

      OSM.OsmNode.startOsmNode(builder);
      OSM.OsmNode.addId(builder, id);
      if (pointsTo) {
        OSM.OsmNode.addPointsTo(builder, pointsTo);
      }
      return OSM.OsmNode.endOsmNode(builder);
    });

    const valuesVector = OSM.GeohashTreeBox.createValuesVector(builder, values);

    OSM.GeohashTreeBox.startGeohashTreeBox(builder);
    OSM.GeohashTreeBox.addKey(builder, key);
    OSM.GeohashTreeBox.addValues(builder, valuesVector);

    box.flatbuffered = OSM.GeohashTreeBox.endGeohashTreeBox(builder);
    return box.flatbuffered;
  }
}
