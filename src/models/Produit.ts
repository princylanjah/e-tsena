export class Produit {
  idProduit: number;
  libelle: string;

  constructor(idProduit: number, libelle: string) {
    this.idProduit = idProduit;
    this.libelle = libelle;
  }

  ajouterProduit(libelle: string) {
    this.libelle = libelle;
  }

  modifierProduit(libelle: string) {
    this.libelle = libelle;
  }

  supprimerProduit() {
    this.libelle = "";
  }
}
