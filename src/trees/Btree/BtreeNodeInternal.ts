import { check, EditRangeResult, index } from ".";
import BTree from "./Btree";
import { BNode } from "./BtreeNode";
import { Builder } from "flatbuffers";

/** Internal node (non-leaf node) ********************************************/
export class BNodeInternal<K, V> extends BNode<K, V> {
  // Note: conventionally B+ trees have one fewer key than the number of
  // children, but I find it easier to keep the array lengths equal: each
  // keys[i] caches the value of children[i].maxKey().
  children: BNode<K, V>[];

  constructor(children: BNode<K, V>[], keys?: K[]) {
    if (!keys) {
      keys = [];
      for (var i = 0; i < children.length; i++) keys[i] = children[i].maxKey();
    }
    super(keys);
    this.children = children;
  }

  clone(): BNode<K, V> {
    var children = this.children.slice(0);
    for (var i = 0; i < children.length; i++) children[i].isShared = true;
    return new BNodeInternal<K, V>(children, this.keys.slice(0));
  }

  greedyClone(force?: boolean): BNode<K, V> {
    if (this.isShared && !force) return this;
    var nu = new BNodeInternal<K, V>(
      this.children.slice(0),
      this.keys.slice(0)
    );
    for (var i = 0; i < nu.children.length; i++)
      nu.children[i] = nu.children[i].greedyClone();
    return nu;
  }

  minKey() {
    return this.children[0].minKey();
  }

  minPair(reusedArray: [K, V]): [K, V] | undefined {
    return this.children[0].minPair(reusedArray);
  }

  maxPair(reusedArray: [K, V]): [K, V] | undefined {
    return this.children[this.children.length - 1].maxPair(reusedArray);
  }

  get(key: K, defaultValue: V | undefined, tree: BTree<K, V>): V | undefined {
    var i = this.indexOf(key, 0, tree._compare),
      children = this.children;

    return i < children.length
      ? children[i].get(key, defaultValue, tree)
      : undefined;
  }

  getPairOrNextLower(
    key: K,
    compare: (a: K, b: K) => number,
    inclusive: boolean,
    reusedArray: [K, V]
  ): [K, V] | undefined {
    var i = this.indexOf(key, 0, compare),
      children = this.children;
    if (i >= children.length) return this.maxPair(reusedArray);
    const result = children[i].getPairOrNextLower(
      key,
      compare,
      inclusive,
      reusedArray
    );
    if (result === undefined && i > 0) {
      return children[i - 1].maxPair(reusedArray);
    }
    return result;
  }

  getPairOrNextHigher(
    key: K,
    compare: (a: K, b: K) => number,
    inclusive: boolean,
    reusedArray: [K, V]
  ): [K, V] | undefined {
    var i = this.indexOf(key, 0, compare),
      children = this.children,
      length = children.length;
    if (i >= length) return undefined;
    const result = children[i].getPairOrNextHigher(
      key,
      compare,
      inclusive,
      reusedArray
    );
    if (result === undefined && i < length - 1) {
      return children[i + 1].minPair(reusedArray);
    }
    return result;
  }

  checkValid(depth: number, tree: BTree<K, V>, baseIndex: number): number {
    let kL = this.keys.length,
      cL = this.children.length;
    check(
      kL === cL,
      "keys/children length mismatch: depth",
      depth,
      "lengths",
      kL,
      cL,
      "baseIndex",
      baseIndex
    );
    check(
      kL > 1 || depth > 0,
      "internal node has length",
      kL,
      "at depth",
      depth,
      "baseIndex",
      baseIndex
    );
    let size = 0,
      c = this.children,
      k = this.keys,
      childSize = 0;
    for (var i = 0; i < cL; i++) {
      size += c[i].checkValid(depth + 1, tree, baseIndex + size);
      childSize += c[i].keys.length;
      check(size >= childSize, "wtf", baseIndex); // no way this will ever fail
      check(
        i === 0 || c[i - 1].constructor === c[i].constructor,
        "type mismatch, baseIndex:",
        baseIndex
      );
      if (c[i].maxKey() != k[i])
        check(
          false,
          "keys[",
          i,
          "] =",
          k[i],
          "is wrong, should be ",
          c[i].maxKey(),
          "at depth",
          depth,
          "baseIndex",
          baseIndex
        );
      if (!(i === 0 || tree._compare(k[i - 1], k[i]) < 0))
        check(
          false,
          "sort violation at depth",
          depth,
          "index",
          i,
          "keys",
          k[i - 1],
          k[i]
        );
    }
    // 2020/08: BTree doesn't always avoid grossly undersized nodes,
    // but AFAIK such nodes are pretty harmless, so accept them.
    let toofew = childSize === 0; // childSize < (tree.maxNodeSize >> 1)*cL;
    if (toofew || childSize > tree.maxNodeSize * cL)
      check(
        false,
        toofew ? "too few" : "too many",
        "children (",
        childSize,
        size,
        ") at depth",
        depth,
        "maxNodeSize:",
        tree.maxNodeSize,
        "children.length:",
        cL,
        "baseIndex:",
        baseIndex
      );
    return size;
  }
  /////////////////////////////////////////////////////////////////////////////
  // Internal Node: set & node splitting //////////////////////////////////////
  set(
    key: K,
    value: V,
    overwrite: boolean | undefined,
    tree: BTree<K, V>
  ): boolean | BNodeInternal<K, V> {
    var c = this.children,
      max = tree._maxNodeSize,
      cmp = tree._compare;
    var i = Math.min(this.indexOf(key, 0, cmp), c.length - 1),
      child = c[i];

    if (child.isShared) c[i] = child = child.clone();
    if (child.keys.length >= max) {
      // child is full; inserting anything else will cause a split.
      // Shifting an item to the left or right sibling may avoid a split.
      // We can do a shift if the adjacent node is not full and if the
      // current key can still be placed in the same node after the shift.
      var other: BNode<K, V>;
      if (
        i > 0 &&
        (other = c[i - 1]).keys.length < max &&
        cmp(child.keys[0], key) < 0
      ) {
        if (other.isShared) c[i - 1] = other = other.clone();
        other.takeFromRight(child);
        this.keys[i - 1] = other.maxKey();
      } else if (
        (other = c[i + 1]) !== undefined &&
        other.keys.length < max &&
        cmp(child.maxKey(), key) < 0
      ) {
        if (other.isShared) c[i + 1] = other = other.clone();
        other.takeFromLeft(child);
        this.keys[i] = c[i].maxKey();
      }
    }
    var result = child.set(key, value, overwrite, tree);
    if (result === false) return false;
    this.keys[i] = child.maxKey();
    if (result === true) return true;
    // The child has split and `result` is a new right child... does it fit?
    if (this.keys.length < max) {
      // yes
      this.insert(i + 1, result);
      return true;
    } else {
      // no, we must split also
      var newRightSibling = this.splitOffRightSide(),
        target: BNodeInternal<K, V> = this;
      if (cmp(result.maxKey(), this.maxKey()) > 0) {
        target = newRightSibling;
        i -= this.keys.length;
      }
      target.insert(i + 1, result);
      return newRightSibling;
    }
  }
  insert(i: index, child: BNode<K, V>) {
    this.children.splice(i, 0, child);
    this.keys.splice(i, 0, child.maxKey());
  }
  splitOffRightSide() {
    var half = this.children.length >> 1;
    return new BNodeInternal<K, V>(
      this.children.splice(half),
      this.keys.splice(half)
    );
  }
  takeFromRight(rhs: BNode<K, V>) {
    // Reminder: parent node must update its copy of key for this node
    // assert: neither node is shared
    // assert rhs.keys.length > (maxNodeSize/2 && this.keys.length<maxNodeSize)
    this.keys.push(rhs.keys.shift()!);
    this.children.push((rhs as BNodeInternal<K, V>).children.shift()!);
  }
  takeFromLeft(lhs: BNode<K, V>) {
    // Reminder: parent node must update its copy of key for this node
    // assert: neither node is shared
    // assert rhs.keys.length > (maxNodeSize/2 && this.keys.length<maxNodeSize)
    this.keys.unshift(lhs.keys.pop()!);
    this.children.unshift((lhs as BNodeInternal<K, V>).children.pop()!);
  }
  /////////////////////////////////////////////////////////////////////////////
  // Internal Node: scanning & deletions //////////////////////////////////////
  // Note: `count` is the next value of the third argument to `onFound`.
  //       A leaf node's `forRange` function returns a new value for this counter,
  //       unless the operation is to stop early.
  forRange<R>(
    low: K,
    high: K,
    includeHigh: boolean | undefined,
    editMode: boolean,
    tree: BTree<K, V>,
    count: number,
    onFound?: (k: K, v: V, counter: number) => EditRangeResult<V, R> | void
  ): EditRangeResult<V, R> | number {
    var cmp = tree._compare;
    var keys = this.keys,
      children = this.children;
    var iLow = this.indexOf(low, 0, cmp),
      i = iLow;
    var iHigh = Math.min(
      high === low ? iLow : this.indexOf(high, 0, cmp),
      keys.length - 1
    );
    if (!editMode) {
      // Simple case
      for (; i <= iHigh; i++) {
        var result = children[i].forRange(
          low,
          high,
          includeHigh,
          editMode,
          tree,
          count,
          onFound
        );
        if (typeof result !== "number") return result;
        count = result;
      }
    } else if (i <= iHigh) {
      try {
        for (; i <= iHigh; i++) {
          if (children[i].isShared) children[i] = children[i].clone();
          var result = children[i].forRange(
            low,
            high,
            includeHigh,
            editMode,
            tree,
            count,
            onFound
          );
          // Note: if children[i] is empty then keys[i]=undefined.
          //       This is an invalid state, but it is fixed below.
          keys[i] = children[i].maxKey();
          if (typeof result !== "number") return result;
          count = result;
        }
      } finally {
        // Deletions may have occurred, so look for opportunities to merge nodes.
        var half = tree._maxNodeSize >> 1;
        if (iLow > 0) iLow--;
        for (i = iHigh; i >= iLow; i--) {
          if (children[i].keys.length <= half) {
            if (children[i].keys.length !== 0) {
              this.tryMerge(i, tree._maxNodeSize);
            } else {
              // child is empty! delete it!
              keys.splice(i, 1);
              children.splice(i, 1);
            }
          }
        }
        if (children.length !== 0 && children[0].keys.length === 0)
          check(false, "emptiness bug");
      }
    }
    return count;
  }

  /** Merges child i with child i+1 if their combined size is not too large */
  tryMerge(i: index, maxSize: number): boolean {
    var children = this.children;
    if (i >= 0 && i + 1 < children.length) {
      if (children[i].keys.length + children[i + 1].keys.length <= maxSize) {
        if (children[i].isShared)
          // cloned already UNLESS i is outside scan range
          children[i] = children[i].clone();
        children[i].mergeSibling(children[i + 1], maxSize);
        children.splice(i + 1, 1);
        this.keys.splice(i + 1, 1);
        this.keys[i] = children[i].maxKey();
        return true;
      }
    }
    return false;
  }

  mergeSibling(rhs: BNode<K, V>, maxNodeSize: number) {
    // assert !this.isShared;
    var oldLength = this.keys.length;
    this.keys.push.apply(this.keys, rhs.keys);
    this.children.push.apply(
      this.children,
      (rhs as any as BNodeInternal<K, V>).children
    );
    // If our children are themselves almost empty due to a mass-delete,
    // they may need to be merged too (but only the oldLength-1 and its
    // right sibling should need this).
    this.tryMerge(oldLength - 1, maxNodeSize);
  }
}
