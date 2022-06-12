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

export interface IOsmNode extends BaseElement {
  type: 'node';
  lat: number;
  lon: number;
  linkCount?: number;
  street_count?: number;
  pointsToNode?: IOsmNode[];
  pointsToNodeId?: string[];
  highway?: string[];
  distance?: number[];
  partOfWays?: IOsmWay[];
}

export interface IOsmWay extends BaseElement {
  type: 'way';
  nodeRefs: string[];
  nodes?: IOsmNode[];
  streetLength?: number;
  line?: [number, number][];
  lat?: number;
  lon?: number;
}

export interface IOsmRelation extends BaseElement {
  type: 'relation';
  members?: string[];
}