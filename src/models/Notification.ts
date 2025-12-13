export class Notification {
  idNotification: number;
  titre: string;
  estLu: boolean;
  dateRappel: Date;

  constructor(idNotification: number, titre: string, dateRappel: Date) {
    this.idNotification = idNotification;
    this.titre = titre;
    this.estLu = false;
    this.dateRappel = dateRappel;
  }

  marquerCommeLue() {
    this.estLu = true;
  }

  annuler() {
    this.titre = "";
    this.estLu = false;
  }

  programmer(date: Date) {
    this.dateRappel = date;
  }
}
