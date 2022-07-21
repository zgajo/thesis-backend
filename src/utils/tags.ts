export const USEFUL_TAGS = [
"addr:postcode",
"addr:city",
"addr:housenumber",
"addr:street",
"name",
"official_name",
"place",
"population",
"population:date",
"website",
"wikidata",
"wikipedia",
"historic",
"phone",
"tourism",
"sport",
"amenity",
"cuisine",
]

export const createTags = (tags: {[key: string]: string} | undefined)=> {
  let newTags: { [x: string]: string } | null = null

  if(!tags) return newTags

  Object.keys(tags).forEach(key => {
    if(USEFUL_TAGS.includes(key)){
      if(!newTags){
        newTags = {[key]: tags[key]} 
      }else {
        newTags[key] = tags[key]
      }
    }
  })

  return newTags
}