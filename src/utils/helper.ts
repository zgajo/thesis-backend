import { IOsmWay } from "../types/osm-read";
import { onewayValues, reversedValues } from "./constants";

export const _isPathOneWay = (path: IOsmWay, bidirectional?: boolean) => {
  if (bidirectional) {
    // # if this is a bi-directional network type, then nothing in it is
    // # considered one-way. eg, if this is a walking network, this may very
    // # well be a one-way street (as cars/bikes go), but in a walking-only
    // # network it is a bi-directional edge (you can walk both directions on
    // # a one-way street). so we will add this path (in both directions) to
    // # the graph and set its oneway attribute to False.
    return false;
  } else if (path.tags?.oneway && String(path.tags["oneway"]) in onewayValues) {
    // # if this path is tagged as one-way and if it is not a bi-directional
    // # network type then we'll add the path in one direction only
    return true;
  } else if (path.tags?.junction && path.tags["junction"] == "roundabout") {
    // # roundabouts are also one-way but are not explicitly tagged as such
    return true;
  } else {
    // # otherwise this path is not tagged as a one-way
    return false;
  }
};

export const _isPathReversed = (path: IOsmWay) => {
  if (path.tags?.oneway && String(path.tags["oneway"]) in reversedValues) {
    return true;
  } else {
    return false;
  }
};