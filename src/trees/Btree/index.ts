// B+ tree by David Piepgrass. License: MIT

export {
  ISetSource,
  ISetSink,
  ISet,
  ISetF,
  ISortedSetSource,
  ISortedSet,
  ISortedSetF,
  IMapSource,
  IMapSink,
  IMap,
  IMapF,
  ISortedMapSource,
  ISortedMap,
  ISortedMapF,
} from "./interfaces";

export type EditRangeResult<V, R = number> = {
  value?: V;
  break?: R;
  delete?: boolean;
};

export type index = number;

// Informative microbenchmarks & stuff:
// http://www.jayconrod.com/posts/52/a-tour-of-v8-object-representation (very educational)
// https://blog.mozilla.org/luke/2012/10/02/optimizing-javascript-variable-access/ (local vars are faster than properties)
// http://benediktmeurer.de/2017/12/13/an-introduction-to-speculative-optimization-in-v8/ (other stuff)
// https://jsperf.com/js-in-operator-vs-alternatives (avoid 'in' operator; `.p!==undefined` faster than `hasOwnProperty('p')` in all browsers)
// https://jsperf.com/instanceof-vs-typeof-vs-constructor-vs-member (speed of type tests varies wildly across browsers)
// https://jsperf.com/detecting-arrays-new (a.constructor===Array is best across browsers, assuming a is an object)
// https://jsperf.com/shallow-cloning-methods (a constructor is faster than Object.create; hand-written clone faster than Object.assign)
// https://jsperf.com/ways-to-fill-an-array (slice-and-replace is fastest)
// https://jsperf.com/math-min-max-vs-ternary-vs-if (Math.min/max is slow on Edge)
// https://jsperf.com/array-vs-property-access-speed (v.x/v.y is faster than a[0]/a[1] in major browsers IF hidden class is constant)
// https://jsperf.com/detect-not-null-or-undefined (`x==null` slightly slower than `x===null||x===undefined` on all browsers)
// Overall, microbenchmarks suggest Firefox is the fastest browser for JavaScript and Edge is the slowest.
// Lessons from https://v8project.blogspot.com/2017/09/elements-kinds-in-v8.html:
//   - Avoid holes in arrays. Avoid `new Array(N)`, it will be "holey" permanently.
//   - Don't read outside bounds of an array (it scans prototype chain).
//   - Small integer arrays are stored differently from doubles
//   - Adding non-numbers to an array deoptimizes it permanently into a general array
//   - Objects can be used like arrays (e.g. have length property) but are slower
//   - V8 source (NewElementsCapacity in src/objects.h): arrays grow by 50% + 16 elements

/**
 * Types that BTree supports by default
 */
export type DefaultComparable =
  | number
  | string
  | Date
  | boolean
  | null
  | undefined
  | (number | string)[]
  | {
      valueOf: () =>
        | number
        | string
        | Date
        | boolean
        | null
        | undefined
        | (number | string)[];
    };

/**
 * Compares DefaultComparables to form a strict partial ordering.
 *
 * Handles +/-0 and NaN like Map: NaN is equal to NaN, and -0 is equal to +0.
 *
 * Arrays are compared using '<' and '>', which may cause unexpected equality:
 * for example [1] will be considered equal to ['1'].
 *
 * Two objects with equal valueOf compare the same, but compare unequal to
 * primitives that have the same value.
 */
export function defaultComparator(
  a: DefaultComparable,
  b: DefaultComparable
): number {
  // Special case finite numbers first for performance.
  // Note that the trick of using 'a - b' and checking for NaN to detect non-numbers
  // does not work if the strings are numeric (ex: "5"). This would leading most
  // comparison functions using that approach to fail to have transitivity.
  if (Number.isFinite(a as any) && Number.isFinite(b as any)) {
    return (a as number) - (b as number);
  }

  // The default < and > operators are not totally ordered. To allow types to be mixed
  // in a single collection, compare types and order values of different types by type.
  let ta = typeof a;
  let tb = typeof b;
  if (ta !== tb) {
    return ta < tb ? -1 : 1;
  }

  if (ta === "object") {
    // standardized JavaScript bug: null is not an object, but typeof says it is
    if (a === null) return b === null ? 0 : -1;
    else if (b === null) return 1;

    a = a!.valueOf() as DefaultComparable;
    b = b!.valueOf() as DefaultComparable;
    ta = typeof a;
    tb = typeof b;
    // Deal with the two valueOf()s producing different types
    if (ta !== tb) {
      return ta < tb ? -1 : 1;
    }
  }

  // a and b are now the same type, and will be a number, string or array
  // (which we assume holds numbers or strings), or something unsupported.
  if (a! < b!) return -1;
  if (a! > b!) return 1;
  if (a === b) return 0;

  // Order NaN less than other numbers
  if (Number.isNaN(a as any)) return Number.isNaN(b as any) ? 0 : -1;
  else if (Number.isNaN(b as any)) return 1;
  // This could be two objects (e.g. [7] and ['7']) that aren't ordered
  return Array.isArray(a) ? 0 : Number.NaN;
}

/**
 * Compares items using the < and > operators. This function is probably slightly
 * faster than the defaultComparator for Dates and strings, but has not been benchmarked.
 * Unlike defaultComparator, this comparator doesn't support mixed types correctly,
 * i.e. use it with `BTree<string>` or `BTree<number>` but not `BTree<string|number>`.
 *
 * NaN is not supported.
 *
 * Note: null is treated like 0 when compared with numbers or Date, but in general
 *   null is not ordered with respect to strings (neither greater nor less), and
 *   undefined is not ordered with other types.
 */
export function simpleComparator(a: string, b: string): number;
export function simpleComparator(a: number | null, b: number | null): number;
export function simpleComparator(a: Date | null, b: Date | null): number;
export function simpleComparator(
  a: (number | string)[],
  b: (number | string)[]
): number;
export function simpleComparator(a: any, b: any): number {
  return a > b ? 1 : a < b ? -1 : 0;
}

import BTree from "./Btree";
import { BNode } from "./BtreeNode";
export { default } from "./Btree";

declare const Symbol: any;
if (Symbol && Symbol.iterator)
  // iterator is equivalent to entries()
(BTree as any).prototype[Symbol.iterator] = BTree.prototype.entries;
(BTree as any).prototype.where = BTree.prototype.filter;
(BTree as any).prototype.setRange = BTree.prototype.setPairs;
(BTree as any).prototype.add = BTree.prototype.set;

export function iterator<T>(
  next: () => IteratorResult<T> = () => ({ done: true, value: undefined })
): IterableIterator<T> {
  var result: any = { next };
  if (Symbol && Symbol.iterator)
    result[Symbol.iterator] = function () {
      return this;
    };
  return result;
}

/**
 * A walkable pointer into a BTree for computing efficient diffs between trees with shared data.
 * - A cursor points to either a key/value pair (KVP) or a node (which can be either a leaf or an internal node).
 *    As a consequence, a cursor cannot be created for an empty tree.
 * - A cursor can be walked forwards using `step`. A cursor can be compared to another cursor to
 *    determine which is ahead in advancement.
 * - A cursor is valid only for the tree it was created from, and only until the first edit made to
 *    that tree since the cursor's creation.
 * - A cursor contains a key for the current location, which is the maxKey when the cursor points to a node
 *    and a key corresponding to a value when pointing to a leaf.
 * - Leaf is only populated if the cursor points to a KVP. If this is the case, levelIndices.length === internalSpine.length + 1
 *    and levelIndices[levelIndices.length - 1] is the index of the value.
 */
export type DiffCursor<K, V> = {
  height: number;
  internalSpine: BNode<K, V>[][];
  levelIndices: number[];
  leaf: BNode<K, V> | undefined;
  currentKey: K;
};

// Optimization: this array of `undefined`s is used instead of a normal
// array of values in nodes where `undefined` is the only value.
// Its length is extended to max node size on first use; since it can
// be shared between trees with different maximums, its length can only
// increase, never decrease. Its type should be undefined[] but strangely
// TypeScript won't allow the comparison V[] === undefined[]. To prevent
// users from making this array too large, BTree has a maximum node size.
//
// FAQ: undefVals[i] is already undefined, so why increase the array size?
// Reading outside the bounds of an array is relatively slow because it
// has the side effect of scanning the prototype chain.
export var undefVals: any[] = [];

export const Delete = { delete: true },
  DeleteRange = () => Delete;
export const Break = { break: true };
export const EmptyLeaf = (function () {
  var n = new BNode<any, any>();
  n.isShared = true;
  return n;
})();
export const EmptyArray: any[] = [];
export const ReusedArray: any[] = []; // assumed thread-local

export function check(fact: boolean, ...args: any[]) {
  if (!fact) {
    args.unshift("B+ tree"); // at beginning of message
    throw new Error(args.join(" "));
  }
}

/** A BTree frozen in the empty state. */
export const EmptyBTree = (() => {
  let t = new BTree();
  t.freeze();
  return t;
})();
