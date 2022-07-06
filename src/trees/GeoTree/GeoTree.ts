import { IOsmNode, IOsmWay } from "../../types/osm-read";
const base32 = "0123456789bcdefghjkmnpqrstuvwxyz"; // (geohash-specific) Base32 map

export class GeoTreeBox<T extends { id?: string; geoTreeBox?: GeoTreeBox<T> }> {
  key: string;
  data: GeoTreeBox<T>[];
  values: T[];
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
      if (!a.id || !b.id) return 0;
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

      if (parent) {
        box.parent = parent;
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
    const boxExists = data.find((box)=>box.key === hashStr)
    if(boxExists){
      boxExists.addNode(node)
      return boxExists
    }
    const box = new GeoTreeBox<T>(hashStr);
    box.addNode(node);
    data.push(box);
    if (parent) box.parent = parent;
    return data;
  }

  hashIndex(hash: string, data: GeoTreeBox<T>[]) {
    function search(value: GeoTreeBox<T>) {
      return value.key === hash;
    }

    return data.findIndex(search);
  }

  getAllNodes(hash: string) {
    let geolevel = 1;
    const precision = Math.min(hash.length, this.precision);
    let tmpData: GeoTreeBox<T>[] | undefined = this.data;
    let tmpBox: GeoTreeBox<T> | undefined;
    let nodes: T[] = [];

    while (geolevel <= precision) {
      const hashStr = hash.substring(0, geolevel);

      // leaf node, search all inside of it
      if (geolevel === precision) {
        tmpBox = this.searchBox(tmpData, hashStr);
        // we are at leaf node
        if (geolevel === this.precision) {
          nodes = nodes.concat(tmpBox?.values || []);
        } else {
          if (tmpBox) {
            nodes = nodes.concat(this.getAllNodesByBox(tmpBox));
          }
        }

        break;
      } else {
        tmpData = this.searchInternalNodeData(tmpData, hashStr);
      }

      if (!tmpData) return;

      ++geolevel;
    }

    return nodes;
    console.log(precision);
  }

  getAllNodesByBox(box: GeoTreeBox<T>) {
    let nodes: T[] = [];
    if (box?.data.length) {
      for (let i = 0; i < box?.data.length; i++) {
        let currentBox = box.data[i];
        nodes = nodes.concat(this.getAllNodesByBox(currentBox));
      }
    }
    else {
      nodes = nodes.concat(box.values || []);
    }
    return nodes;
  }

  getNode(hash: string) {
    let geolevel = 1;
    let tmpData: GeoTreeBox<T>[] | undefined = this.data;
    let node: IOsmNode[] | undefined;

    while (geolevel <= this.precision && tmpData) {
      const hashStr = hash.substring(0, geolevel);

      if (geolevel === this.precision) {
        return this.searchLeafNodeValues(tmpData, hashStr);
      } else {
        tmpData = this.searchInternalNodeData(tmpData, hashStr);
      }

      if (!tmpData) return;

      ++geolevel;
    }

    return node;
  }

  searchBox(tmpData: GeoTreeBox<T>[] | undefined, hashStr: string) {
    return (tmpData || []).find(value => {
      return value.key === hashStr;
    });
  }

  searchInternalNodeData(tmpData: GeoTreeBox<T>[] | undefined, hashStr: string) {
    return (tmpData || []).find(value => {
      return value.key === hashStr;
    })?.data;
  }

  searchLeafNodeValues(tmpData: GeoTreeBox<T>[] | undefined, hashStr: string) {
    return (tmpData || []).find(value => {
      return value.key === hashStr;
    })?.values;
  }

  static /**
   * Returns SW/NE latitude/longitude bounds of specified geohash.
   *
   * @param   {string} geohash - Cell that bounds are required of.
   * @returns {{sw: {lat: number, lon: number}, ne: {lat: number, lon: number}}}
   * @throws  Invalid geohash.
   */
  bounds(geohash: string) {
    if (geohash.length == 0) throw new Error("Invalid geohash");

    geohash = geohash.toLowerCase();

    let evenBit = true;
    let latMin = -90,
      latMax = 90;
    let lonMin = -180,
      lonMax = 180;

    for (let i = 0; i < geohash.length; i++) {
      const chr = geohash.charAt(i);
      const idx = base32.indexOf(chr);
      if (idx == -1) throw new Error("Invalid geohash");

      for (let n = 4; n >= 0; n--) {
        const bitN = (idx >> n) & 1;
        if (evenBit) {
          // longitude
          const lonMid = (lonMin + lonMax) / 2;
          if (bitN == 1) {
            lonMin = lonMid;
          } else {
            lonMax = lonMid;
          }
        } else {
          // latitude
          const latMid = (latMin + latMax) / 2;
          if (bitN == 1) {
            latMin = latMid;
          } else {
            latMax = latMid;
          }
        }
        evenBit = !evenBit;
      }
    }

    const bounds = [
      [latMin, lonMin],
      [latMax, lonMax],
    ];
    //  {
    //      sw: { lat: latMin, lon: lonMin },
    //      ne: { lat: latMax, lon: lonMax },
    //  };

    return bounds;
  }
}
