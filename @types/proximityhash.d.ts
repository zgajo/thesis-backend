declare module 'proximityhash' {
  interface Options {
    latitude: number;
    longitude: number;
    radius: number;
    precision: number;
    georaptorFlag?: boolean;
    minlevel?: number;
    maxlevel?: number;
    approxHashCount?: boolean;
  }
  function  createGeohashes(options: Options): string[]
  export = {createGeohashes};

  // ...
}