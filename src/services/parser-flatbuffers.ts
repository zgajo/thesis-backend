import * as flatbuffers from "flatbuffers";
import { OsmNodesConnection, OsmNodesConnectionData } from "../utils/flatbuffers/osm";

let builder = new flatbuffers.Builder(1024);

export class FlatbufferHelper {
  static nodesConnectorData(distance: number, highway: string, polyline: string, travelTime: number) {
    const highwayEncoded = builder.createString(highway);
    const polylineEncoded = builder.createString(polyline);

    OsmNodesConnectionData.startOsmNodesConnectionData(builder);
    OsmNodesConnectionData.addDistance(builder, distance);
    OsmNodesConnectionData.addHighway(builder, highwayEncoded);
    OsmNodesConnectionData.addPolyline(builder, polylineEncoded);
    OsmNodesConnectionData.addTravelTime(builder, travelTime);

    return OsmNodesConnectionData.endOsmNodesConnectionData(builder);
  }
  static nodesConnector(nodeId: string, data: number) {
    const nodeIdEncoded = builder.createString(nodeId);

    OsmNodesConnection.startOsmNodesConnection(builder);
    OsmNodesConnection.addData(builder, data);
    OsmNodesConnection.addNodeId(builder, nodeIdEncoded);

    return OsmNodesConnection.endOsmNodesConnection(builder);
  }
}
