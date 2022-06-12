import { defaultComparator } from "sorted-btree";
import { BNodesTree } from "../../flatbuffers/geo-table/b-nodes-tree";
import { BTreeNode } from "../../flatbuffers/geo-table/b-tree-node";

export class FlatBufferBTree {
  btree: BNodesTree;

  constructor(tree: BNodesTree) {
    this.btree = tree;
  }

  indexOf = (
    node: BTreeNode,
    keysLength: number,
    key: number | string,
    leaf: boolean,
    cmp = defaultComparator
  ): number => {
    var lo = 0,
      hi = keysLength,
      mid = hi >> 1,
      chosen = 0;

    let leafNodeFound = false;

    while (lo < hi) {
      var c = cmp(node.keys(mid), key);

      if (c === 0) return mid;
      else {
        if (c < 0) {
          lo = mid + 1;
        } else if (c > 0) {
          // key < keys[mid]
          chosen = mid;
          hi = mid;
        } else {
          // c is NaN or otherwise invalid
          if (key === key)
            // at least the search key is not NaN
            return keysLength;
          else throw new Error("BTree: NaN was used as a key");
        }
      }
      mid = (lo + hi) >> 1;
    }

    if (leaf && !leafNodeFound) {
      throw new Error(`BTree: Key ${key} not found in db`);
    }
    return chosen;
  };

  getKey(key: string | number) {
    let node = this.btree.root();
    let foundNode = null;

    while (!foundNode && node) {
      const index = this.indexOf(
        node,
        node.keysLength(),
        key,
        (node?.childrenLength() as number) <= 0
      );

      if (node?.childrenLength()) {
        node = node?.children(index);
      } else {
        foundNode = node?.values(index);
      }
    }

    return foundNode;
  }
}
