export const PFP = [
  'almond-milk.png',
  'bag.png',
  'blender.png',
  'bowl.png',
  'broccoli.png',
  'burger.png',
  'carrot.png',
  'cauliflower.png',
  'corn.png',
  'crate.png',
  'dish.png',
  'guacamole.png',
  'ham.png',
  'hat.png',
  'hotdog.png',
  'juice.png',
  'kebab.png',
  'noodles.png',
  'onion.png',
  'orange.png',
  'patty.png',
  'salad-bowl.png',
  'soy.png',
]

export function randomPfpId() {
  return Math.floor(Math.random() * PFP.length)
}

/** Accessible name for an avatar, e.g. `salad-bowl.png` → "Salad bowl". */
export function pfpLabel(id: number) {
  const file = PFP[id]

  if (!file)
    return 'Profile picture'

  const words = file.replace(/\.png$/, '').replace(/-/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}
