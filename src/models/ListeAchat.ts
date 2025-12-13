import { Article } from "./Article";
import { Notification } from "./Notification";

export class ListeAchat {
  idAchat: number;
  nomListe: string;
  dateAchat: Date;
  montantTotal: number;
  articles: Article[] = [];
  notifications: Notification[] = [];

  constructor(idAchat: number, nomListe: string, dateAchat: Date) {
    this.idAchat = idAchat;
    this.nomListe = nomListe;
    this.dateAchat = dateAchat;
    this.montantTotal = 0;
  }

  modifierListe(nom: string) {
    this.nomListe = nom;
  }

  creerListe(article: Article) {
    this.articles.push(article);
  }

  supprimerListe() {
    this.articles = [];
  }

  consulterTableauArticles(): Article[] {
    return this.articles;
  }

  calculerTotal() {
    this.montantTotal = this.articles.reduce(
      (sum, article) => sum + article.calculerPrixTotal(),
      0
    );
    return this.montantTotal;
  }
}
