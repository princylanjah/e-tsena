import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export const getDb = () => {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync('etsena.db');
  }
  return dbInstance;
};

// Vérifier si une colonne existe dans une table
const columnExists = (db: SQLite.SQLiteDatabase, table: string, column: string): boolean => {
  try {
    const result = db.getAllSync(`PRAGMA table_info(${table})`);
    return result.some((col: any) => col.name === column);
  } catch {
    return false;
  }
};

// Migration : Ajouter la colonne 'unite' si elle n'existe pas
const migrateDatabase = (db: SQLite.SQLiteDatabase) => {
  console.log('🔄 Vérification des migrations...');
  
  // Vérifier si la colonne 'unite' existe dans la table Produit
  if (!columnExists(db, 'Produit', 'unite')) {
    console.log('📝 Migration: Ajout de la colonne "unite" à Produit');
    try {
      db.execSync(`ALTER TABLE Produit ADD COLUMN unite TEXT DEFAULT 'pcs'`);
      
      // Mettre à jour les unités des produits existants
      db.execSync(`
        UPDATE Produit SET unite = 'kg' WHERE libelle IN ('Riz', 'Poulet', 'Viande');
        UPDATE Produit SET unite = 'L' WHERE libelle IN ('Huile', 'Lait');
      `);
      
      console.log('✅ Migration réussie: colonne "unite" ajoutée');
    } catch (e) {
      console.error('❌ Erreur migration:', e);
    }
  } else {
    console.log('✅ Colonne "unite" déjà présente');
  }
  
  // Migration: Ajouter la colonne 'unite' à LigneAchat si elle n'existe pas
  if (!columnExists(db, 'LigneAchat', 'unite')) {
    console.log('📝 Migration: Ajout de la colonne "unite" à LigneAchat');
    try {
      db.execSync(`ALTER TABLE LigneAchat ADD COLUMN unite TEXT DEFAULT 'pcs'`);
      console.log('✅ Migration réussie: colonne "unite" ajoutée à LigneAchat');
    } catch (e) {
      console.error('❌ Erreur migration LigneAchat.unite:', e);
    }
  }

  // Migration: Ajouter achatId à Notification
  if (!columnExists(db, 'Notification', 'achatId')) {
    console.log('📝 Migration: Ajout de la colonne "achatId" à Notification');
    try {
      db.execSync(`ALTER TABLE Notification ADD COLUMN achatId INTEGER`);
      console.log('✅ Migration réussie: colonne "achatId" ajoutée à Notification');
    } catch (e) {
      console.error('❌ Erreur migration Notification.achatId:', e);
    }
  }
  
  // Migration: Ajouter libelleProduit et supprimer idProduit dans LigneAchat
  if (columnExists(db, 'LigneAchat', 'idProduit') && !columnExists(db, 'LigneAchat', 'libelleProduit')) {
    console.log('📝 Migration: Restructuration de LigneAchat (ajout libelleProduit)');
    try {
      // Nettoyer toute table temporaire d'une précédente migration échouée
      db.execSync('DROP TABLE IF EXISTS LigneAchat_new');

      // Créer une table temporaire avec la nouvelle structure
      db.execSync(`
        CREATE TABLE LigneAchat_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          idAchat INTEGER NOT NULL,
          libelleProduit TEXT NOT NULL,
          quantite REAL DEFAULT 1,
          prixUnitaire REAL DEFAULT 0,
          prixTotal REAL DEFAULT 0,
          unite TEXT DEFAULT 'pcs',
          FOREIGN KEY (idAchat) REFERENCES Achat(id) ON DELETE CASCADE
        );
      `);
      
      // Copier les données existantes avec un libellé sécurisé
      // Récupérer l'unité du produit si elle existe, sinon utiliser 'pcs'
      const hasUniteColumn = columnExists(db, 'LigneAchat', 'unite');
      if (hasUniteColumn) {
        db.execSync(`
          INSERT INTO LigneAchat_new (id, idAchat, libelleProduit, quantite, prixUnitaire, prixTotal, unite)
          SELECT 
            la.id, 
            la.idAchat, 
            COALESCE(p.libelle, 'Produit inconnu') as libelleProduit,
            la.quantite, 
            la.prixUnitaire, 
            la.prixTotal,
            COALESCE(la.unite, p.unite, 'pcs') as unite
          FROM LigneAchat la
          LEFT JOIN Produit p ON p.id = la.idProduit;
        `);
      } else {
        db.execSync(`
          INSERT INTO LigneAchat_new (id, idAchat, libelleProduit, quantite, prixUnitaire, prixTotal, unite)
          SELECT 
            la.id, 
            la.idAchat, 
            COALESCE(p.libelle, 'Produit inconnu') as libelleProduit,
            la.quantite, 
            la.prixUnitaire, 
            la.prixTotal,
            COALESCE(p.unite, 'pcs') as unite
          FROM LigneAchat la
          LEFT JOIN Produit p ON p.id = la.idProduit;
        `);
      }
      
      // Supprimer l'ancienne table et renommer la nouvelle
      db.execSync('DROP TABLE LigneAchat');
      db.execSync('ALTER TABLE LigneAchat_new RENAME TO LigneAchat');
      
      console.log('✅ Migration LigneAchat réussie');
    } catch (e) {
      console.error('❌ Erreur migration LigneAchat:', e);
      // Nettoyer la table temporaire pour permettre une nouvelle tentative
      try {
        db.execSync('DROP TABLE IF EXISTS LigneAchat_new');
      } catch (cleanupError) {
        console.warn('⚠️ Impossible de supprimer LigneAchat_new après échec:', cleanupError);
      }
    }
  }
  
  // Supprimer les tables inutiles (optionnel)
  try {
    db.execSync(`DROP TABLE IF EXISTS TypeProduit`);
    db.execSync(`DROP TABLE IF EXISTS Rapport`);
    db.execSync(`DROP TABLE IF EXISTS DepenseParCategorie`);
    db.execSync(`DROP TABLE IF EXISTS DepenseParProduit`);
    db.execSync(`DROP TABLE IF EXISTS DepenseParDate`);
    console.log('🗑️ Tables inutiles supprimées');
  } catch (e) {
    console.warn('⚠️ Erreur suppression tables:', e);
  }
};

export const initDatabase = () => {
  console.log('🚀 Initialisation de la base de données...');
  const db = getDb();
  
  // Créer les tables
  db.execSync(`
    PRAGMA journal_mode = WAL;
    
    CREATE TABLE IF NOT EXISTS Produit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      libelle TEXT NOT NULL,
      unite TEXT DEFAULT 'pcs',
      idCategorie INTEGER,
      prixMoyen REAL
    );
    
    CREATE TABLE IF NOT EXISTS Achat (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nomListe TEXT,
      dateAchat TEXT,
      montantTotal REAL DEFAULT 0
    );
    
    CREATE TABLE IF NOT EXISTS LigneAchat (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      idAchat INTEGER NOT NULL,
      libelleProduit TEXT NOT NULL,
      quantite REAL DEFAULT 1,
      prixUnitaire REAL DEFAULT 0,
      prixTotal REAL DEFAULT 0,
      unite TEXT DEFAULT 'pcs',
      FOREIGN KEY (idAchat) REFERENCES Achat(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Notification (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      date TEXT NOT NULL,
      read INTEGER DEFAULT 0
    );
  `);
  
  console.log('✅ Tables créées');
  
  // Appliquer les migrations
  migrateDatabase(db);
  
  // Insérer des produits par défaut si la table est vide
  try {
    const count = db.getFirstSync<{ c: number }>('SELECT COUNT(*) as c FROM Produit');
    if (!count || count.c === 0) {
      console.log('📝 Insertion des produits par défaut...');
      const produits = [
        { libelle: 'Riz', unite: 'kg' },
        { libelle: 'Huile', unite: 'L' },
        { libelle: 'Lait', unite: 'L' },
        { libelle: 'Pain', unite: 'pcs' },
        { libelle: 'Poulet', unite: 'kg' },
        { libelle: 'Cahier', unite: 'pcs' },
        { libelle: 'Stylo', unite: 'pcs' },
        { libelle: 'Savon', unite: 'pcs' },
        { libelle: 'Tomate', unite: 'kg' },
        { libelle: 'Oignon', unite: 'kg' },
      ];
      
      produits.forEach(p => {
        db.runSync(
          'INSERT INTO Produit (libelle, unite, idCategorie) VALUES (?, ?, 1)',
          [p.libelle, p.unite]
        );
      });
      console.log(`✅ ${produits.length} produits insérés`);
    }
  } catch (e) {
    console.warn('⚠️ Erreur insertion produits:', e);
  }
  
  console.log('✅ Base de données initialisée avec succès');
  return true;
};

export const checkDatabase = () => {
  try {
    const db = getDb();
    const tables = db.getAllSync('SELECT name FROM sqlite_master WHERE type="table"');
    console.log('✅ Tables:', tables);
    
    // Vérifier la structure de la table Produit
    const produitStructure = db.getAllSync('PRAGMA table_info(Produit)');
    console.log('📊 Structure Produit:', produitStructure);
    
    const produitCount = db.getFirstSync<{ c: number }>('SELECT COUNT(*) as c FROM Produit');
    console.log('📦 Nombre de produits:', produitCount?.c || 0);
    
    return true;
  } catch (error) {
    console.error('❌ Erreur vérification DB:', error);
    return false;
  }
};

// Fonction pour réinitialiser complètement la DB (en cas de problème)
export const resetDatabase = () => {
  try {
    const db = getDb();
    console.log('🗑️ RESET: Suppression de toutes les tables...');
    
    db.execSync(`
      DROP TABLE IF EXISTS LigneAchat;
      DROP TABLE IF EXISTS Achat;
      DROP TABLE IF EXISTS Produit;
      DROP TABLE IF EXISTS TypeProduit;
      DROP TABLE IF EXISTS Rapport;
      DROP TABLE IF EXISTS DepenseParCategorie;
      DROP TABLE IF EXISTS DepenseParProduit;
      DROP TABLE IF EXISTS DepenseParDate;
    `);
    
    console.log('✅ Tables supprimées');
    console.log('🔄 Réinitialisation...');
    
    initDatabase();
    
    console.log('✅ Base de données réinitialisée avec succès');
    return true;
  } catch (error) {
    console.error('❌ Erreur reset DB:', error);
    return false;
  }
};