import { IOsmNode, IOsmWay } from "../../types/osm-read";

export class GeoTreeBox<T  extends { id?: string; geoTreeBox?: GeoTreeBox<T> }> {
  key: string;
  data: GeoTreeBox<T>[];
  values: (T)[];
  parent: GeoTreeBox<T> | null;
  flatbuffered: number | null;

  constructor(key: string) {
    this.key = key;
    this.data = [];
    this.values = [];
    this.parent = null;
    this.flatbuffered = null;
  }

  addNode(node: T) {
    this.values.push(node);
    node.geoTreeBox = this;
    this.sortNodes();
    return this;
  }

  addData(box: GeoTreeBox<T>) {
    this.data.push(box);
    this.sortData();
    return this;
  }

  sortNodes() {
    this.values.sort((a, b) => {
      if(!a.id || !b.id) return 0
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

export class GeoTree<T> {
  precision: number;
  data: GeoTreeBox<T>[];
  flatbuffered: number | null;
  nodes: number;

  constructor(precision?: number) {
    this.precision = precision || 10;
    this.data = [];
    this.flatbuffered = null;
    this.nodes = 0;
  }

  insert(geohash: string, node: T, geolevel = 0) {
    if (node) {
      this.nodes += 1;
      this._insert(geohash, node, geolevel, this.data);
    }
  }

  _insert(hash: string, node: T, geolevel: number, data: GeoTreeBox<T>[], parent?: GeoTreeBox<T>) {
    const hashStr = hash.substring(0, geolevel + 1);

    // Leaf
    if (geolevel + 1 === this.precision) {
      const d = this.insertIntoLeaf(hashStr, node, data, parent);

      return d;
    }

    const hashIndex = this.hashIndex(hashStr, data);

    // create all the hashes from this level to the leaf
    if (hashIndex === -1) {
      const box = new GeoTreeBox<T>(hashStr);

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

  insertIntoLeaf(hashStr: string, node: T, data: GeoTreeBox<T>[], parent?: GeoTreeBox<T>) {
    const box = new GeoTreeBox<T>(hashStr);
    box.addNode(node);
    data.push(box);
    if(parent) box.parent = parent;
    return data;
  }

  hashIndex(hash: string, data: GeoTreeBox<T>[]) {
    function search(value: GeoTreeBox<T>) {
      return value.key === hash;
    }

    return data.findIndex(search);
  }

  getNode(hash: string) {
    let geolevel = 1;
    let tmpData: GeoTreeBox<T>[] | undefined = this.data;
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

  searchInternalNode(tmpData: GeoTreeBox<T>[] | undefined, hashStr: string) {
    return (tmpData || []).find(value => {
      return value.key === hashStr;
    })?.data;
  }

  searchLeafNode(tmpData: GeoTreeBox<T>[] | undefined, hashStr: string) {
    return (tmpData || []).find(value => {
      return value.key === hashStr;
    })?.values;
  }
}
