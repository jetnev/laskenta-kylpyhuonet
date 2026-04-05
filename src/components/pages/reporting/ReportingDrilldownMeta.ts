export type ReportingDrillKind = 'families' | 'family-detail' | 'customers' | 'projects';
export type ReportingDrillDescriptionKind = ReportingDrillKind | 'products';

export function getReportingDrilldownDescription(kind: ReportingDrillDescriptionKind | null) {
  switch (kind) {
    case 'families':
    case 'family-detail':
      return 'Tarkista kohteen tila, arvo, kate ja vastuuhenkilö. Avaa tarjous jatkotoimia varten.';
    case 'customers':
      return 'Skannaa asiakkaat nopeasti ja poraudu tarvittaessa tarkempaan tarjousnäkymään.';
    case 'projects':
      return 'Tarkista projektipoikkeamat, vastuuhenkilöt ja kohteet jotka vaativat seuraavan toimenpiteen.';
    default:
      return 'Tarkista poikkeavat kohteet ja avaa tarvittavat tarjoukset seuraavaa toimenpidettä varten.';
  }
}