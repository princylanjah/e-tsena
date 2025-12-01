// Conseils utiles pour l'application E-tsena
export const TIPS_OF_THE_DAY = [
  {
    id: 1,
    icon: 'bulb-outline',
    title: 'Organisez par catégories',
    text: 'Groupez vos achats par catégories (alimentaire, ménager, etc.) pour optimiser vos courses et économiser du temps.',
  },
  {
    id: 2,
    icon: 'calculator-outline',
    title: 'Surveillez votre budget',
    text: 'Utilisez les rapports pour suivre vos dépenses mensuelles et identifier les postes où vous pouvez économiser.',
  },
  {
    id: 3,
    icon: 'time-outline',
    title: 'Planifiez à l\'avance',
    text: 'Créez vos listes d\'achats la veille pour éviter les achats impulsifs et respecter votre budget.',
  },
  {
    id: 4,
    icon: 'stats-chart-outline',
    title: 'Analysez vos habitudes',
    text: 'Consultez les statistiques pour comprendre vos habitudes de consommation et optimiser vos achats.',
  },
  {
    id: 5,
    icon: 'checkmark-circle-outline',
    title: 'Cochez au fur et à mesure',
    text: 'Validez vos achats en temps réel pour ne rien oublier et avoir un suivi précis de vos dépenses.',
  },
  {
    id: 6,
    icon: 'calendar-outline',
    title: 'Utilisez les filtres de date',
    text: 'Filtrez vos rapports par période pour analyser vos dépenses saisonnières ou mensuelles.',
  },
  {
    id: 7,
    icon: 'duplicate-outline',
    title: 'Réutilisez vos listes',
    text: 'Dupliquez vos listes d\'achats récurrentes pour gagner du temps lors de vos courses habituelles.',
  },
  {
    id: 8,
    icon: 'search-outline',
    title: 'Recherchez rapidement',
    text: 'Utilisez la barre de recherche pour retrouver rapidement une liste d\'achat spécifique.',
  },
  {
    id: 9,
    icon: 'leaf-outline',
    title: 'Mangez de saison',
    text: 'Privilégiez les fruits et légumes de saison. Ils sont souvent moins chers et meilleurs pour la santé.',
  },
  {
    id: 10,
    icon: 'pricetag-outline',
    title: 'Comparez les prix',
    text: 'Regardez le prix au kilo ou au litre pour comparer efficacement les produits entre eux.',
  },
  {
    id: 11,
    icon: 'nutrition-outline',
    title: 'Évitez la faim',
    text: 'Ne faites jamais vos courses le ventre vide, vous risquez d\'acheter plus que nécessaire.',
  },
  {
    id: 12,
    icon: 'trash-outline',
    title: 'Réduisez le gaspillage',
    text: 'Vérifiez vos placards avant de partir pour ne pas racheter ce que vous avez déjà.',
  },
  {
    id: 13,
    icon: 'wallet-outline',
    title: 'Fixez un budget',
    text: 'Définissez une limite de dépenses avant de partir et essayez de vous y tenir.',
  },
  {
    id: 14,
    icon: 'bag-handle-outline',
    title: 'Sacs réutilisables',
    text: 'N\'oubliez pas vos sacs réutilisables pour économiser et protéger l\'environnement.',
  }
];

/**
 * Retourne un conseil aléatoire ou basé sur la date
 */
export const getTipOfTheDay = (): typeof TIPS_OF_THE_DAY[0] => {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const tipIndex = dayOfYear % TIPS_OF_THE_DAY.length;
  return TIPS_OF_THE_DAY[tipIndex];
};
