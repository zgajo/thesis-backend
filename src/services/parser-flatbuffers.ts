import * as flatbuffers from "flatbuffers";
import * as fs from "fs";
import { GeoTree, GeoTreeBox } from "../trees/GeoTree/GeoTree";
import { IOsmNode, IOsmWay } from "../types/osm-read";
import { COUNTRY } from "../utils/constants";
import * as OSM from "../utils/flatbuffers/osm";
import { DataTable } from "../utils/flatbuffers/osm/parser/data-table";
import { Parser } from './parser';

let builder = new flatbuffers.Builder(1024);



export class FlatbufferHelper {
  // static nodesConnectorData(distance: number, highway: string, polyline: string, travelTime: number) {
  //   const highwayEncoded = builder.createString(highway);
  //   const polylineEncoded = builder.createString(polyline);

  //   OSM.OsmNodesConnectionData.startOsmNodesConnectionData(builder);
  //   OSM.OsmNodesConnectionData.addDistance(builder, distance);
  //   OSM.OsmNodesConnectionData.addHighway(builder, highwayEncoded);
  //   OSM.OsmNodesConnectionData.addPolyline(builder, polylineEncoded);
  //   OSM.OsmNodesConnectionData.addTravelTime(builder, travelTime);

  //   return OSM.OsmNodesConnectionData.endOsmNodesConnectionData(builder);
  // }
  // static nodesConnector(nodeId: string, data: TPointsToNode) {
  //   const nodeIdEncoded = builder.createString(nodeId);

  //   OSM.OsmNodesConnection.startOsmNodesConnection(builder);
  //   OSM.OsmNodesConnection.addData(builder, data);
  //   OSM.OsmNodesConnection.addNodeId(builder, nodeIdEncoded);

  //   return OSM.OsmNodesConnection.endOsmNodesConnection(builder);
  // }

  static generateFlatbuffers(parserService: InstanceType<typeof Parser>){    
    const geohashHighwayTable = FlatbufferHelper.generateFlatbuffersGeotree(parserService.nodes.highwayGeohash)
    const geohashElementsTable = FlatbufferHelper.generateFlatbuffersGeotree(parserService.geotreeElements)
    const bTreeHistoric = parserService.historic.storeNodesToFile(builder)
    const bTreeNatural = parserService.natural.storeNodesToFile(builder)
    const bTreeSport = parserService.sport.storeNodesToFile(builder)
    const bTreeTourism = parserService.tourism.storeNodesToFile(builder)
    const bTreeWaterway = parserService.waterway.storeNodesToFile(builder)

    DataTable.startDataTable(builder)

    if(geohashHighwayTable) DataTable.addGeohashHighwayNodes(builder, geohashHighwayTable)
    if(geohashElementsTable) DataTable.addGeohashElementsNodes(builder, geohashElementsTable)
    DataTable.addBtreeHistoric(builder, bTreeHistoric)
    DataTable.addBtreeNatural(builder, bTreeNatural)
    DataTable.addBtreeSport(builder, bTreeSport)
    DataTable.addBtreeTourism(builder, bTreeTourism)
    DataTable.addBtreeWaterway(builder, bTreeWaterway)

    const dataTable = DataTable.endDataTable(builder)

    builder.finish(dataTable)
    let buf = builder.asUint8Array(); // Of type `Uint8Array`.
    fs.writeFileSync(`${COUNTRY}-osm.bin`, buf, 'binary');
  }

  static generateFlatbuffersGeotree(geoTree: GeoTree<IOsmNode | IOsmWay> | undefined) {
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

  static handleGeoTreeBox(box: GeoTreeBox<IOsmNode | IOsmWay>): number {
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

  static handleGeohashLeaf(box: GeoTreeBox<IOsmNode | IOsmWay>) {
    const key = builder.createString(box.key);

    const values = box.values.map(node => {
      const id = builder.createString(node.geohash);
      
      let highways: number[] = []
      let polylines: number[] = []
      let distances: number[] = []
      let travel_times: number[] = []
      let pointsTo: number[] = [];
      let speed: number[] = [];
      let wayId: number[] = [];
      let oneWays: boolean[] = [];
      
      if("pointsToNodeSimplified" in node) {
        node.pointsToNodeSimplified?.forEach(node => {
          highways.push(builder.createString( node.highway))
          
          if(node.node.geohash) pointsTo.push( builder.createString(node.node.geohash))
          if(node.polyline) polylines.push( builder.createString(node.polyline))
          distances.push( node.distance)
          if(node.speed) speed.push(node.speed)
          if(node.travelTime) travel_times.push( node.travelTime)
          if(node.wayId) wayId.push(builder.createString(node.wayId))
          
          if(node.oneWay !== undefined && node.oneWay !== null) oneWays.push(node.oneWay)
        })
      }
      
      const vectorHighways = highways.length ? OSM.OsmNode.createHighwayVector(builder, highways) : null
      const vectorPolylines = polylines.length ? OSM.OsmNode.createPolylineVector(builder, polylines) : null
      const vectorDistances = distances.length ? OSM.OsmNode.createHighwayVector(builder, distances) : null
      const vectorSpeeds = speed.length ? OSM.OsmNode.createHighwayVector(builder, speed) : null
      const vectorTravelTimes = travel_times.length ? OSM.OsmNode.createHighwayVector(builder, travel_times) : null
      const vectorPointsTo = pointsTo.length ? OSM.OsmNode.createPointsToVector(builder, pointsTo) : null
      const vectorWayIds = wayId.length ? OSM.OsmNode.createWayVector(builder, wayId) : null
      const vectorOneWay = oneWays.length ? OSM.OsmNode.createOneWayVector(builder, oneWays) : null
      
      // Use tags only if not highway
      let tags
      if(!("pointsToNodeSimplified" in node)) {
        tags =builder.createString(JSON.stringify(node.tags))
      };

      OSM.OsmNode.startOsmNode(builder);
      if(id) OSM.OsmNode.addId(builder, id);
      if(vectorHighways) OSM.OsmNode.addHighway(builder, vectorHighways);
      if(vectorPolylines) OSM.OsmNode.addPolyline(builder, vectorPolylines);
      if(vectorDistances) OSM.OsmNode.addDistance(builder, vectorDistances);
      if(vectorTravelTimes) OSM.OsmNode.addTravelTime(builder, vectorTravelTimes);
      if(vectorPointsTo) OSM.OsmNode.addPointsTo(builder, vectorPointsTo);
      if(vectorSpeeds) OSM.OsmNode.addSpeed(builder, vectorSpeeds);
      if(vectorWayIds) OSM.OsmNode.addWay(builder, vectorWayIds);
      if(vectorOneWay) OSM.OsmNode.addOneWay(builder, vectorOneWay);
      if(!("pointsToNodeSimplified" in node) && tags) {
        OSM.OsmNode.addTags(builder, tags)
      };
      const flatbuffered =  OSM.OsmNode.endOsmNode(builder);
      node.flatbuffered = flatbuffered;
      return flatbuffered
    });

    const valuesVector = OSM.GeohashTreeBox.createValuesVector(builder, values);

    OSM.GeohashTreeBox.startGeohashTreeBox(builder);
    OSM.GeohashTreeBox.addKey(builder, key);
    OSM.GeohashTreeBox.addValues(builder, valuesVector);

    box.flatbuffered = OSM.GeohashTreeBox.endGeohashTreeBox(builder);
    return box.flatbuffered;
  }
}
