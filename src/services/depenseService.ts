import { AchatRepo, Achat } from '../repositories/achatRepo';
import { getDb } from '../db/init';

export const DepenseService = {
  /**
   * Calcule le total des dépenses pour un mois donné
   * @param month Index du mois (0-11)
   * @param year Année (ex: 2025)
   */
  async calculerDepensesMensuelles(month: number, year: number): Promise<number> {
    // Définir la période (du 1er au dernier jour du mois)
    const startDate = new Date(year, month, 1).toISOString();
    const endDate = new Date(year, month + 1, 0).toISOString();

    const achats = await AchatRepo.getAchatsByPeriod(startDate, endDate);
    
    // Somme des montants
    return (achats as Achat[]).reduce((total, achat) => total + (achat.montantTotal || 0), 0);
  },

  /**
   * Calcule le total global des dépenses enregistrées
   */
  async calculerTotalGlobal(): Promise<number> {
    const achats = await AchatRepo.listAchats();
    return (achats as Achat[]).reduce((total, achat) => total + (achat.montantTotal || 0), 0);
  },

  /**
   * Récupère les dépenses groupées par jour pour un graphique
   */
  async getDepensesParJour(month: number, year: number) {
    const startDate = new Date(year, month, 1).toISOString();
    const endDate = new Date(year, month + 1, 0).toISOString();
    
    const achats = await AchatRepo.getAchatsByPeriod(startDate, endDate);
    
    const result: Record<string, number> = {};
    
    for (const achat of (achats as Achat[])) {
      const day = achat.dateAchat.split('T')[0]; // YYYY-MM-DD
      result[day] = (result[day] || 0) + (achat.montantTotal || 0);
    }

    return result;
  },

  /**
   * Récupère la répartition des dépenses par produit (Global)
   */
  async getRepartitionParProduit() {
    const db = getDb();
    const res = db.getAllSync(`
      SELECT l.libelleProduit as name, SUM(l.prixTotal) as montant
      FROM LigneAchat l
      GROUP BY l.libelleProduit ORDER BY montant DESC
    `);
    return res as { name: string; montant: number }[];
  },

  /**
   * Récupère le total des dépenses sur une période donnée
   */
  async getTotalSurPeriode(startDate: string, endDate: string) {
    const db = getDb();
    const res = db.getAllSync(`
      SELECT COALESCE(SUM(l.prixTotal), 0) as t 
      FROM LigneAchat l JOIN Achat a ON a.id = l.idAchat 
      WHERE DATE(a.dateAchat) BETWEEN ? AND ?
    `, [startDate, endDate]);
    return (res[0] as any)?.t || 0;
  },

  /**
   * Récupère les statistiques comparatives (montant + nombre d'achats) sur une période
   */
  async getStatsComparatives(startDate: string, endDate: string) {
    const db = getDb();
    const res = db.getAllSync(`
       SELECT COALESCE(SUM(l.prixTotal), 0) as montant, COUNT(DISTINCT a.id) as nb
       FROM Achat a JOIN LigneAchat l ON a.id = l.idAchat
       WHERE DATE(a.dateAchat) BETWEEN ? AND ?`, [startDate, endDate]);
    return {
      montant: (res[0] as any)?.montant || 0,
      nbAchats: (res[0] as any)?.nb || 0
    };
  },

  /**
   * Récupère le détail des produits achetés sur une période
   */
  async getDetailsProduitsSurPeriode(startDate: string, endDate: string) {
    const db = getDb();
    // Debug: Afficher les dates de requête
    console.log('[SQL] Requête produits période:', startDate, 'à', endDate);
    
    // Debug: Voir toutes les dates d'achat disponibles
    const allDates = db.getAllSync(`SELECT id, dateAchat FROM Achat ORDER BY dateAchat DESC LIMIT 10`);
    console.log('[SQL] Dates achats disponibles:', allDates);
    
    // Requête principale avec paramètres
    const res = db.getAllSync(`
      SELECT l.libelleProduit, SUM(l.quantite) as totalQte, SUM(l.prixTotal) as totalPrix
      FROM LigneAchat l 
      JOIN Achat a ON a.id = l.idAchat 
      WHERE DATE(a.dateAchat) BETWEEN ? AND ?
      GROUP BY l.libelleProduit
      ORDER BY totalPrix DESC
    `, [startDate, endDate]);
    
    console.log('[SQL] Résultat:', res.length, 'produits trouvés', res);
    return res as { libelleProduit: string; totalQte: number; totalPrix: number }[];
  }
};
