export interface Suggestion {
  keyword: string;
  items: string[];
}

export const SMART_SUGGESTIONS: Suggestion[] = [
  {
    keyword: 'Gâteau',
    items: ['Farine', 'Sucre', 'Oeufs', 'Beurre', 'Levure chimique', 'Lait', 'Vanille', 'Chocolat']
  },
  {
    keyword: 'Pizza',
    items: ['Pâte à pizza', 'Sauce tomate', 'Fromage râpé', 'Jambon', 'Champignons', 'Olives', 'Origan']
  },
  {
    keyword: 'Fourniture scolaire',
    items: ['Cahiers', 'Stylos bleus', 'Stylos rouges', 'Crayons de bois', 'Gomme', 'Règle', 'Trousse', 'Cartable']
  },
  {
    keyword: 'Pâtes',
    items: ['Spaghetti', 'Sauce tomate', 'Viande hachée', 'Oignons', 'Ail', 'Fromage râpé']
  },
  {
    keyword: 'Petit déjeuner',
    items: ['Pain', 'Beurre', 'Confiture', 'Lait', 'Café', 'Jus d\'orange', 'Céréales']
  },
  {
    keyword: 'Ménage',
    items: ['Liquide vaisselle', 'Éponge', 'Sac poubelle', 'Nettoyant sol', 'Chiffon', 'Lessive']
  },
  {
    keyword: 'Anniversaire',
    items: ['Bougies', 'Ballons', 'Gâteau', 'Boissons', 'Gobelets', 'Serviettes', 'Cadeau']
  },
  {
    keyword: 'Barbecue',
    items: ['Charbon', 'Saucisses', 'Côtelettes', 'Chips', 'Boissons', 'Sauces', 'Pain']
  },
  {
    keyword: 'Salade',
    items: ['Laitue', 'Tomates', 'Concombre', 'Maïs', 'Vinaigrette', 'Oeufs durs', 'Thon']
  },
  {
    keyword: 'Riz cantonais',
    items: ['Riz', 'Petits pois', 'Oeufs', 'Jambon', 'Crevettes', 'Sauce soja', 'Huile']
  }
];

export const getSuggestions = (text: string): Suggestion[] => {
  if (!text || text.length < 2) return [];
  const lowerText = text.toLowerCase();
  return SMART_SUGGESTIONS.filter(s => 
    lowerText.includes(s.keyword.toLowerCase()) || 
    s.keyword.toLowerCase().includes(lowerText)
  );
};
