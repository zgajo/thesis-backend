export const penaltyTransition: {[key: string]: number} = {
  motorway: 0,
  motorway_link: 0,
  trunk: 10,
  trunk_link: 10,
  primary: 50,
  primary_link: 51,
  secondary: 80,
  secondary_link: 80,
  tertiary: 130,
  tertiary_link: 130,
  residential: 167,
  service: 230,
}

export const getPenaltyTransition = (fromHighway: string, toHighway: string) => {
  const fromPenalty = typeof penaltyTransition[fromHighway] === "number" ? penaltyTransition[fromHighway] :  200
  const toPenalty = typeof penaltyTransition[toHighway] === "number" ? penaltyTransition[toHighway] : 200

  return Math.max(0, toPenalty - fromPenalty)
}