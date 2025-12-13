import { Produit } from "./Produit";

export class Article {
  idArticle: number;
  prixUnitaire: number;
  quantite: number;
  unite: string;
  estCoche: boolean;
  produit: Produit;

  constructor(
    idArticle: number,
    prixUnitaire: number,
    quantite: number,
    unite: string,
    produit: Produit
  ) {
    this.idArticle = idArticle;
    this.prixUnitaire = prixUnitaire;
    this.quantite = quantite;
    this.unite = unite;
    this.estCoche = false;
    this.produit = produit;
  }

  calculerPrixTotal() {
    return this.prixUnitaire * this.quantite;
  }

  ajouterArticle(qte: number) {
    this.quantite += qte;
  }

  modifierArticle(prix: number, unite: string) {
    this.prixUnitaire = prix;
    this.unite = unite;
  }

  supprimerArticle() {
    this.quantite = 0;
  }

  marquerAcheter() {
    this.estCoche = true;
  }
}
