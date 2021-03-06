import { GeoTreeBox } from "../trees/GeoTree/GeoTree";

type OsmElementType = 'node' | 'way' | 'relation';

interface BaseElement {
  type: OsmElementType;
  id: string;
  timestamp?: string;
  version?: number;
  changeset?: number;
  user?: string;
  tags?: { [key: string]: string };
}
type TPointsToNodeId = string; 
type TPointsToNodeObject = IOsmNode; 
type TPointsToNodeHighway = string; 
type TPointsToNodePolyline = string; 
type TPointsToNodeDistance = number; 
export type TPointsToNode = {
  nodeId: TPointsToNodeId, 
  node: TPointsToNodeObject,
  highway: TPointsToNodeHighway,
  distance: TPointsToNodeDistance,
  way: IOsmWay,
  oneWay?: boolean,
  wayId?: string,
  polyline?: TPointsToNodePolyline,
  travelTime?: number,
  speed?: number,
}


export interface IOsmNode extends BaseElement {
  type: 'node';
  lat: number;
  lon: number;
  geohash?: string;
  geoTreeBox?: GeoTreeBox<IOsmNode>;
  inNodes?: number;
  outNodes?: number;
  linkCount?: number;
  street_count?: number;
  pointsToNode?: TPointsToNode[];
  pointsToNodeSimplified?: TPointsToNode[];
  flatbuffersPointsToNode?: number[];
  partOfWays?: IOsmWay[];
  partOfWayId?: string[];
  flatbuffered?: number;
}

export interface IOsmWay extends BaseElement {
  type: 'way';
  nodeRefs: string[];
  nodes?: IOsmNode[];
  streetLength?: number;
  line?: [number, number][];
  geometry?: string;
  lat?: number;
  lon?: number;
  geohash?: string;
  geoTreeBox?: GeoTreeBox<IOsmNode | IOsmWay>;
  flatbuffered?: number;
}

export interface IOsmRelation extends BaseElement {
  type: 'relation';
  members?: string[];
}