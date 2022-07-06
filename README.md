Node:

- id (geohash),
- street_count: number
- highway string
- points_to_node (to which it points to) []string,
- way_ids maps to points_to_node []string
- length double,[]
- speed_kph double,[]
- travel_time double,[]
- highway string[]
- oneway boolean[]
- name string[]
- geometry (including all the nodes that were in between) string[]

Way:

Discover how to move this mapping into way so that we could reduce storage space


## Possible solutions


### 1. Problem with geohash - finding nearest edge:

Maybe its not a problem, I can take all edges in a current radius and find the closest one. 

Maybe to set maximum length of each edge to 500m or 1000m. This way it could be that there is no way that will be out of scope

### Possible solution: 

Not storing geohash, but into rtree - this will give us bigger flatbuffer tree. 

Extracting edges from geohash (using proximity search [proximityhash](https://github.com/ashwin711/proximityhash/blob/master/proximityhash.py) ), importing them into local rtree (rtree of edges), then finding nearest edge to current location. [rbush](https://www.npmjs.com/package/rbush) + [rbush-knn](https://github.com/mourner/rbush-knn)

