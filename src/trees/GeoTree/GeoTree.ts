import { IOsmNode } from "../../types/osm-read";

export class GeoTreeBox {
  key: string;
  data: GeoTreeBox[];
  values: IOsmNode[];
  parent: GeoTreeBox | null;
  flatbuffered: number | null;

  constructor(key: string) {
    this.key = key;
    this.data = [];
    this.values = [];
    this.parent = null;
    this.flatbuffered = null;
  }

  addNode(node: IOsmNode) {
    this.values.push(node);
    node.geoTreeBox = this;
    this.sortNodes();
    return this;
  }

  addData(box: GeoTreeBox) {
    this.data.push(box);
    this.sortData();
    return this;
  }

  sortNodes() {
    this.values.sort((a, b) => {
      if (a.id > b.id) {
        return 1;
      } else if (a.id < b.id) {
        return -1;
      } else {
        return 0;
      }
    });
  }

  sortData() {
    this.data.sort((a, b) => {
      if (a.key > b.key) {
        return 1;
      } else if (a.key < b.key) {
        return -1;
      } else {
        return 0;
      }
    });
  }
}

export class GeoTree {
  precision: number;
  data: GeoTreeBox[];
  flatbuffered: number | null;

  constructor(precision?: number) {
    this.precision = precision || 10;
    this.data = [];
    this.flatbuffered = null;
  }

  insert(geohash: string, node: IOsmNode, geolevel = 0) {
    if (node) {
      this._insert(geohash, node, geolevel, this.data);
    }
  }

  _insert(hash: string, node: IOsmNode, geolevel: number, data: GeoTreeBox[], parent?: GeoTreeBox) {
    const hashStr = hash.substring(0, geolevel + 1);

    // Leaf
    if (geolevel + 1 === this.precision) {
      const d = this.insertIntoLeaf(hashStr, node, data, parent);

      return d;
    }

    const hashIndex = this.hashIndex(hashStr, data);

    // create all the hashes from this level to the leaf
    if (hashIndex === -1) {
      const box = new GeoTreeBox(hashStr);

      this._insert(hash, node, ++geolevel, box.data, box);

      box.sortData();
      box.sortNodes();

      data.push(box);

      if(parent){
        box.parent = parent
      }

      return data;
    }

    this._insert(hash, node, ++geolevel, data[hashIndex].data);

    data[hashIndex].sortData();
    data[hashIndex].sortNodes();

    // hash on this level is found
    return data;
  }

  insertIntoLeaf(hashStr: string, node: IOsmNode, data: GeoTreeBox[], parent?: GeoTreeBox) {
    const box = new GeoTreeBox(hashStr);
    box.addNode(node);
    data.push(box);
    if(parent) box.parent = parent;
    return data;
  }

  hashIndex(hash: string, data: GeoTreeBox[]) {
    function search(value: GeoTreeBox) {
      return value.key === hash;
    }

    return data.findIndex(search);
  }

  getNode(hash: string) {
    let geolevel = 1;
    let tmpData: GeoTreeBox[] | undefined = this.data;
    let node: IOsmNode[] | undefined;

    while (geolevel <= this.precision && tmpData) {
      const hashStr = hash.substring(0, geolevel);

      if (geolevel === this.precision) {
        return this.searchLeafNode(tmpData, hashStr);
      } else {
        tmpData = this.searchInternalNode(tmpData, hashStr);
      }

      if (!tmpData) return;

      ++geolevel;
    }

    return node;
  }

  searchInternalNode(tmpData: GeoTreeBox[] | undefined, hashStr: string) {
    return (tmpData || []).find(value => {
      return value.key === hashStr;
    })?.data;
  }

  searchLeafNode(tmpData: GeoTreeBox[] | undefined, hashStr: string) {
    return (tmpData || []).find(value => {
      return value.key === hashStr;
    })?.values;
  }
}
