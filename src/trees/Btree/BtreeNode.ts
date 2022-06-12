import { EditRangeResult } from "sorted-btree";
import { check, index, undefVals } from ".";
import BTree from "./Btree";
import { Way } from "../Way";
import { Node } from "../Node";

/** Leaf node / base class. **************************************************/
export class BNode<K, V> {
  // If this is an internal node, _keys[i] is the highest key in children[i].
  keys: K[];
  values: V[];
  isShared: true | undefined;
  get isLeaf() {
    return (this as any).children === undefined;
  }

  constructor(keys: K[] = [], values?: V[]) {
    this.keys = keys;
    this.values = values || (undefVals as any[]);
    this.isShared = undefined;
  }

  ///////////////////////////////////////////////////////////////////////////
  // Shared methods /////////////////////////////////////////////////////////

  maxKey() {
    return this.keys[this.keys.length - 1];
  }

  // If key not found, returns i^failXor where i is the insertion index.
  // Callers that don't care whether there was a match will set failXor=0.
  indexOf(key: K, failXor: number, cmp: (a: K, b: K) => number): index {
    const keys = this.keys;
    var lo = 0,
      hi = keys.length,
      mid = hi >> 1;
    while (lo < hi) {
      var c = cmp(keys[mid], key);
      if (c < 0) lo = mid + 1;
      else if (c > 0)
        // key < keys[mid]
        hi = mid;
      else if (c === 0) return mid;
      else {
        // c is NaN or otherwise invalid
        if (key === key)
          // at least the search key is not NaN
          return keys.length;
        else throw new Error("BTree: NaN was used as a key");
      }
      mid = (lo + hi) >> 1;
    }
    return mid ^ failXor;

    // Unrolled version: benchmarks show same speed, not worth using
    /*var i = 1, c: number = 0, sum = 0;
    if (keys.length >= 4) {
      i = 3;
      if (keys.length >= 8) {
        i = 7;
        if (keys.length >= 16) {
          i = 15;
          if (keys.length >= 32) {
            i = 31;
            if (keys.length >= 64) {
              i = 127;
              i += (c = i < keys.length ? cmp(keys[i], key) : 1) < 0 ? 64 : -64;
              sum += c;
              i += (c = i < keys.length ? cmp(keys[i], key) : 1) < 0 ? 32 : -32;
              sum += c;
            }
            i += (c = i < keys.length ? cmp(keys[i], key) : 1) < 0 ? 16 : -16;
            sum += c;
          }
          i += (c = i < keys.length ? cmp(keys[i], key) : 1) < 0 ? 8 : -8;
          sum += c;
        }
        i += (c = i < keys.length ? cmp(keys[i], key) : 1) < 0 ? 4 : -4;
        sum += c;
      }
      i += (c = i < keys.length ? cmp(keys[i], key) : 1) < 0 ? 2 : -2;
      sum += c;
    }
    i += (c = i < keys.length ? cmp(keys[i], key) : 1) < 0 ? 1 : -1;
    c = i < keys.length ? cmp(keys[i], key) : 1;
    sum += c;
    if (c < 0) {
      ++i;
      c = i < keys.length ? cmp(keys[i], key) : 1;
      sum += c;
    }
    if (sum !== sum) {
      if (key === key) // at least the search key is not NaN
        return keys.length ^ failXor;
      else
        throw new Error("BTree: NaN was used as a key");
    }
    return c === 0 ? i : i ^ failXor;*/
  }

  /////////////////////////////////////////////////////////////////////////////
  // Leaf Node: misc //////////////////////////////////////////////////////////

  minKey(): K | undefined {
    return this.keys[0];
  }

  minPair(reusedArray: [K, V]): [K, V] | undefined {
    if (this.keys.length === 0) return undefined;
    reusedArray[0] = this.keys[0];
    reusedArray[1] = this.values[0];
    return reusedArray;
  }

  maxPair(reusedArray: [K, V]): [K, V] | undefined {
    if (this.keys.length === 0) return undefined;
    const lastIndex = this.keys.length - 1;
    reusedArray[0] = this.keys[lastIndex];
    reusedArray[1] = this.values[lastIndex];
    return reusedArray;
  }

  clone(): BNode<K, V> {
    var v = this.values;
    return new BNode<K, V>(
      this.keys.slice(0),
      v === undefVals ? v : v.slice(0)
    );
  }

  greedyClone(force?: boolean): BNode<K, V> {
    return this.isShared && !force ? this : this.clone();
  }

  get(key: K, defaultValue: V | undefined, tree: BTree<K, V>): V | undefined {
    var i = this.indexOf(key, -1, tree._compare);
    return i < 0 ? defaultValue : this.values[i];
  }

  getPairOrNextLower(
    key: K,
    compare: (a: K, b: K) => number,
    inclusive: boolean,
    reusedArray: [K, V]
  ): [K, V] | undefined {
    var i = this.indexOf(key, -1, compare);
    const indexOrLower = i < 0 ? ~i - 1 : inclusive ? i : i - 1;
    if (indexOrLower >= 0) {
      reusedArray[0] = this.keys[indexOrLower];
      reusedArray[1] = this.values[indexOrLower];
      return reusedArray;
    }
    return undefined;
  }

  getPairOrNextHigher(
    key: K,
    compare: (a: K, b: K) => number,
    inclusive: boolean,
    reusedArray: [K, V]
  ): [K, V] | undefined {
    var i = this.indexOf(key, -1, compare);
    const indexOrLower = i < 0 ? ~i : inclusive ? i : i + 1;
    const keys = this.keys;
    if (indexOrLower < keys.length) {
      reusedArray[0] = keys[indexOrLower];
      reusedArray[1] = this.values[indexOrLower];
      return reusedArray;
    }
    return undefined;
  }

  keyStartsWith(key: K) {
    return this;
  }

  checkValid(depth: number, tree: BTree<K, V>, baseIndex: number): number {
    var kL = this.keys.length,
      vL = this.values.length;
    check(
      this.values === undefVals ? kL <= vL : kL === vL,
      "keys/values length mismatch: depth",
      depth,
      "with lengths",
      kL,
      vL,
      "and baseIndex",
      baseIndex
    );
    // Note: we don't check for "node too small" because sometimes a node
    // can legitimately have size 1. This occurs if there is a batch
    // deletion, leaving a node of size 1, and the siblings are full so
    // it can't be merged with adjacent nodes. However, the parent will
    // verify that the average node size is at least half of the maximum.
    check(
      depth == 0 || kL > 0,
      "empty leaf at depth",
      depth,
      "and baseIndex",
      baseIndex
    );
    return kL;
  }

  /////////////////////////////////////////////////////////////////////////////
  // Leaf Node: set & node splitting //////////////////////////////////////////

  set(
    key: K,
    value: V,
    overwrite: boolean | undefined,
    tree: BTree<K, V>
  ): boolean | BNode<K, V> {
    var i = this.indexOf(key, -1, tree._compare);
    if (i < 0) {
      // key does not exist yet
      i = ~i;
      tree._size++;

      if (this.keys.length < tree._maxNodeSize) {
        return this.insertInLeaf(i, key, value, tree);
      } else {
        // This leaf node is full and must split
        var newRightSibling = this.splitOffRightSide(),
          target: BNode<K, V> = this;
        if (i > this.keys.length) {
          i -= this.keys.length;
          target = newRightSibling;
        }
        target.insertInLeaf(i, key, value, tree);
        return newRightSibling;
      }
    } else {
      // Key already exists
      if (overwrite !== false) {
        if (value !== undefined) this.reifyValues();
        // usually this is a no-op, but some users may wish to edit the key
        this.keys[i] = key;

        const t =
          value instanceof Array
            ? ([
                ...(this.values[i]
                  ? (this.values[i] as unknown as V[]).map((el) => el)
                  : []),
                ...value,
              ] as unknown as V)
            : value;

        this.values[i] = t;
      }
      return false;
    }
  }

  reifyValues() {
    if (this.values === undefVals)
      return (this.values = this.values.slice(0, this.keys.length));
    return this.values;
  }

  insertInLeaf(i: index, key: K, value: V, tree: BTree<K, V>) {
    this.keys.splice(i, 0, key);
    if (this.values === undefVals) {
      while (undefVals.length < tree._maxNodeSize) undefVals.push(undefined);
      if (value === undefined) {
        return true;
      } else {
        this.values = undefVals.slice(0, this.keys.length - 1);
      }
    }

    this.values.splice(i, 0, value);
    return true;
  }

  takeFromRight(rhs: BNode<K, V>) {
    // Reminder: parent node must update its copy of key for this node
    // assert: neither node is shared
    // assert rhs.keys.length > (maxNodeSize/2 && this.keys.length<maxNodeSize)
    var v = this.values;
    if (rhs.values === undefVals) {
      if (v !== undefVals) v.push(undefined as any);
    } else {
      v = this.reifyValues();
      v.push(rhs.values.shift()!);
    }
    this.keys.push(rhs.keys.shift()!);
  }

  takeFromLeft(lhs: BNode<K, V>) {
    // Reminder: parent node must update its copy of key for this node
    // assert: neither node is shared
    // assert rhs.keys.length > (maxNodeSize/2 && this.keys.length<maxNodeSize)
    var v = this.values;
    if (lhs.values === undefVals) {
      if (v !== undefVals) v.unshift(undefined as any);
    } else {
      v = this.reifyValues();
      v.unshift(lhs.values.pop()!);
    }
    this.keys.unshift(lhs.keys.pop()!);
  }

  splitOffRightSide(): BNode<K, V> {
    // Reminder: parent node must update its copy of key for this node
    var half = this.keys.length >> 1,
      keys = this.keys.splice(half);
    var values =
      this.values === undefVals ? undefVals : this.values.splice(half);
    return new BNode<K, V>(keys, values);
  }

  /////////////////////////////////////////////////////////////////////////////
  // Leaf Node: scanning & deletions //////////////////////////////////////////

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
    var iLow, iHigh;
    if (high === low) {
      if (!includeHigh) return count;
      iHigh = (iLow = this.indexOf(low, -1, cmp)) + 1;
      if (iLow < 0) return count;
    } else {
      iLow = this.indexOf(low, 0, cmp);
      iHigh = this.indexOf(high, -1, cmp);
      if (iHigh < 0) iHigh = ~iHigh;
      else if (includeHigh === true) iHigh++;
    }
    var keys = this.keys,
      values = this.values;
    if (onFound !== undefined) {
      for (var i = iLow; i < iHigh; i++) {
        var key = keys[i];
        var result = onFound(key, values[i], count++);
        if (result !== undefined) {
          if (editMode === true) {
            if (key !== keys[i] || this.isShared === true)
              throw new Error("BTree illegally changed or cloned in editRange");
            if (result && result.delete) {
              this.keys.splice(i, 1);
              if (this.values !== undefVals) this.values.splice(i, 1);
              tree._size--;
              i--;
              iHigh--;
            } else if (result && result.hasOwnProperty("value")) {
              values![i] = result.value!;
            }
          }
          if (result && result.break !== undefined) return result;
        }
      }
    } else count += iHigh - iLow;
    return count;
  }

  /** Adds entire contents of right-hand sibling (rhs is left unchanged) */
  mergeSibling(rhs: BNode<K, V>, _: number) {
    this.keys.push.apply(this.keys, rhs.keys);
    if (this.values === undefVals) {
      if (rhs.values === undefVals) return;
      this.values = this.values.slice(0, this.keys.length);
    }
    this.values.push.apply(this.values, rhs.reifyValues());
  }
}
