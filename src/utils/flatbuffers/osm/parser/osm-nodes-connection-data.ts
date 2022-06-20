// automatically generated by the FlatBuffers compiler, do not modify

import * as flatbuffers from 'flatbuffers';

export class OsmNodesConnectionData {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):OsmNodesConnectionData {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsOsmNodesConnectionData(bb:flatbuffers.ByteBuffer, obj?:OsmNodesConnectionData):OsmNodesConnectionData {
  return (obj || new OsmNodesConnectionData()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsOsmNodesConnectionData(bb:flatbuffers.ByteBuffer, obj?:OsmNodesConnectionData):OsmNodesConnectionData {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new OsmNodesConnectionData()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

highway():string|null
highway(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
highway(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

distance():number {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.readFloat64(this.bb_pos + offset) : 0.0;
}

polyline():string|null
polyline(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
polyline(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

travelTime():number {
  const offset = this.bb!.__offset(this.bb_pos, 10);
  return offset ? this.bb!.readFloat64(this.bb_pos + offset) : 0.0;
}

static startOsmNodesConnectionData(builder:flatbuffers.Builder) {
  builder.startObject(4);
}

static addHighway(builder:flatbuffers.Builder, highwayOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, highwayOffset, 0);
}

static addDistance(builder:flatbuffers.Builder, distance:number) {
  builder.addFieldFloat64(1, distance, 0.0);
}

static addPolyline(builder:flatbuffers.Builder, polylineOffset:flatbuffers.Offset) {
  builder.addFieldOffset(2, polylineOffset, 0);
}

static addTravelTime(builder:flatbuffers.Builder, travelTime:number) {
  builder.addFieldFloat64(3, travelTime, 0.0);
}

static endOsmNodesConnectionData(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createOsmNodesConnectionData(builder:flatbuffers.Builder, highwayOffset:flatbuffers.Offset, distance:number, polylineOffset:flatbuffers.Offset, travelTime:number):flatbuffers.Offset {
  OsmNodesConnectionData.startOsmNodesConnectionData(builder);
  OsmNodesConnectionData.addHighway(builder, highwayOffset);
  OsmNodesConnectionData.addDistance(builder, distance);
  OsmNodesConnectionData.addPolyline(builder, polylineOffset);
  OsmNodesConnectionData.addTravelTime(builder, travelTime);
  return OsmNodesConnectionData.endOsmNodesConnectionData(builder);
}
}
