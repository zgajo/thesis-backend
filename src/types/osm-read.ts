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
type TPointsToNodeDistance = number; 
export type TPointsToNode = [
  TPointsToNodeId, 
  TPointsToNodeObject,
  TPointsToNodeHighway,
  TPointsToNodeDistance,
  IOsmWay
]
export interface IOsmNode extends BaseElement {
  type: 'node';
  lat: number;
  lon: number;
  linkCount?: number;
  street_count?: number;
  pointsToNode?: TPointsToNode[];
  partOfWays?: IOsmWay[];
  partOfWayId?: string[];
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
}

export interface IOsmRelation extends BaseElement {
  type: 'relation';
  members?: string[];
}