export function shopCategoryIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('fruit')) return '🍎';
  if (n.includes('veget')) return '🥬';
  if (n.includes('dairy') || n.includes('milk')) return '🥛';
  if (n.includes('snack') || n.includes('biscuit') || n.includes('chocolate')) return '🍪';
  if (n.includes('bever') || n.includes('drink')) return '🥤';
  if (n.includes('bakery') || n.includes('bread')) return '🍞';
  if (n.includes('breakfast') || n.includes('cereal')) return '🥣';
  if (n.includes('baby')) return '🍼';
  if (n.includes('cosmetic') || n.includes('beauty')) return '💄';
  if (n.includes('dry fruit') || n.includes('nut')) return '🥜';
  if (n.includes('frozen')) return '🧊';
  if (n.includes('rice') || n.includes('atta') || n.includes('grain')) return '🌾';
  if (n.includes('spice')) return '🌶️';
  if (n.includes('oil')) return '🫒';
  return '🛍️';
}

export function shopProductEmoji(name: string) {
  const n = name.toLowerCase();
  if (n.includes('banana')) return '🍌';
  if (n.includes('apple')) return '🍎';
  if (n.includes('milk')) return '🥛';
  if (n.includes('potato')) return '🥔';
  if (n.includes('tomato')) return '🍅';
  return '🥗';
}

export function shopTileColor(categoryDisplayName: string) {
  const name = categoryDisplayName.toLowerCase();
  if (name.includes('fruit')) return 'linear-gradient(145deg, #fff4e6, #ffe8cc)';
  if (name.includes('veget')) return 'linear-gradient(145deg, #ecfdf3, #d1fae5)';
  if (name.includes('dairy')) return 'linear-gradient(145deg, #eff6ff, #dbeafe)';
  return 'linear-gradient(145deg, #f8fafc, #e2e8f0)';
}
