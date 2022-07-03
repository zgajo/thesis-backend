// automatically generated by the FlatBuffers compiler, do not modify

import * as flatbuffers from 'flatbuffers';

import { BTree } from '../../osm/parser/b-tree';
import { GeohashTree } from '../../osm/parser/geohash-tree';


export class DataTable {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
__init(i:number, bb:flatbuffers.ByteBuffer):DataTable {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsDataTable(bb:flatbuffers.ByteBuffer, obj?:DataTable):DataTable {
  return (obj || new DataTable()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsDataTable(bb:flatbuffers.ByteBuffer, obj?:DataTable):DataTable {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new DataTable()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

geohashHighwayNodes(obj?:GeohashTree):GeohashTree|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? (obj || new GeohashTree()).__init(this.bb!.__indirect(this.bb_pos + offset), this.bb!) : null;
}

btreeHistoric(obj?:BTree):BTree|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? (obj || new BTree()).__init(this.bb!.__indirect(this.bb_pos + offset), this.bb!) : null;
}

btreeNatural(obj?:BTree):BTree|null {
  const offset = this.bb!.__offset(this.bb_pos, 8);
  return offset ? (obj || new BTree()).__init(this.bb!.__indirect(this.bb_pos + offset), this.bb!) : null;
}

btreeSport(obj?:BTree):BTree|null {
  const offset = this.bb!.__offset(this.bb_pos, 10);
  return offset ? (obj || new BTree()).__init(this.bb!.__indirect(this.bb_pos + offset), this.bb!) : null;
}

btreeTourism(obj?:BTree):BTree|null {
  const offset = this.bb!.__offset(this.bb_pos, 12);
  return offset ? (obj || new BTree()).__init(this.bb!.__indirect(this.bb_pos + offset), this.bb!) : null;
}

btreeWaterway(obj?:BTree):BTree|null {
  const offset = this.bb!.__offset(this.bb_pos, 14);
  return offset ? (obj || new BTree()).__init(this.bb!.__indirect(this.bb_pos + offset), this.bb!) : null;
}

static startDataTable(builder:flatbuffers.Builder) {
  builder.startObject(6);
}

static addGeohashHighwayNodes(builder:flatbuffers.Builder, geohashHighwayNodesOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, geohashHighwayNodesOffset, 0);
}

static addBtreeHistoric(builder:flatbuffers.Builder, btreeHistoricOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, btreeHistoricOffset, 0);
}

static addBtreeNatural(builder:flatbuffers.Builder, btreeNaturalOffset:flatbuffers.Offset) {
  builder.addFieldOffset(2, btreeNaturalOffset, 0);
}

static addBtreeSport(builder:flatbuffers.Builder, btreeSportOffset:flatbuffers.Offset) {
  builder.addFieldOffset(3, btreeSportOffset, 0);
}

static addBtreeTourism(builder:flatbuffers.Builder, btreeTourismOffset:flatbuffers.Offset) {
  builder.addFieldOffset(4, btreeTourismOffset, 0);
}

static addBtreeWaterway(builder:flatbuffers.Builder, btreeWaterwayOffset:flatbuffers.Offset) {
  builder.addFieldOffset(5, btreeWaterwayOffset, 0);
}

static endDataTable(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static finishDataTableBuffer(builder:flatbuffers.Builder, offset:flatbuffers.Offset) {
  builder.finish(offset);
}

static finishSizePrefixedDataTableBuffer(builder:flatbuffers.Builder, offset:flatbuffers.Offset) {
  builder.finish(offset, undefined, true);
}

}
