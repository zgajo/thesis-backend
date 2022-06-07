export interface ParsedNode {
  id: string,
  lat: number,
  lon: number,
  tags?: {
    [key: string]: any,
    highway?: string,
    name?: string,
    maxspeed?: string,
  },
}