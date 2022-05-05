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
