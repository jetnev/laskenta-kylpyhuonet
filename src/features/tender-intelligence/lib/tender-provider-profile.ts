import type { TenderProviderCredential, TenderProviderProfileDetails } from '../types/tender-intelligence';

export type TenderProviderProfileReadinessState = 'empty' | 'partial' | 'ready';

export interface TenderProviderProfileReadiness {
  state: TenderProviderProfileReadinessState;
  label: string;
  summary: string;
  nextActions: string[];
  counts: {
    contacts: number;
    primaryContacts: number;
    activeCredentials: number;
    constraints: number;
    documents: number;
    responseTemplates: number;
  };
}

function isCredentialActive(credential: TenderProviderCredential, now: Date) {
  if (!credential.validUntil) {
    return true;
  }

  const validUntil = new Date(credential.validUntil);

  if (Number.isNaN(validUntil.getTime())) {
    return true;
  }

  return validUntil.getTime() >= now.getTime();
}

export function buildTenderProviderProfileReadiness(
  providerProfile: TenderProviderProfileDetails | null | undefined,
  now: Date = new Date(),
): TenderProviderProfileReadiness {
  if (!providerProfile) {
    return {
      state: 'empty',
      label: 'Ei aloitettu',
      summary: 'Tarjoajaprofiilia ei ole vielä muodostettu organisaation valmiuksista, aineistosta ja vastauspohjista.',
      nextActions: [
        'Luo tarjoajaprofiilin runko yrityksen ydintiedoilla.',
        'Lisää vähintään yksi ensisijainen yhteyshenkilö.',
        'Kirjaa vähintään yksi käyttökelpoinen pätevyys tai todistus.',
      ],
      counts: {
        contacts: 0,
        primaryContacts: 0,
        activeCredentials: 0,
        constraints: 0,
        documents: 0,
        responseTemplates: 0,
      },
    };
  }

  const counts = {
    contacts: providerProfile.contacts.length,
    primaryContacts: providerProfile.contacts.filter((contact) => contact.isPrimary).length,
    activeCredentials: providerProfile.credentials.filter((credential) => isCredentialActive(credential, now)).length,
    constraints: providerProfile.constraints.length,
    documents: providerProfile.documents.length,
    responseTemplates: providerProfile.responseTemplates.length,
  };

  const coreFieldsComplete = Boolean(
    providerProfile.profile.companyName.trim()
    && providerProfile.profile.summary?.trim()
    && providerProfile.profile.serviceArea?.trim(),
  );
  const ready = coreFieldsComplete && counts.primaryContacts > 0 && counts.activeCredentials > 0 && counts.responseTemplates > 0;
  const nextActions: string[] = [];

  if (!providerProfile.profile.summary?.trim()) {
    nextActions.push('Tiivistä tarjoajan vahvuudet ja tarjooma profiilin kuvaukseen.');
  }

  if (!providerProfile.profile.serviceArea?.trim()) {
    nextActions.push('Määritä palvelualue, jotta soveltuvuus voidaan verrata tarjouspyynnön maantieteeseen.');
  }

  if (counts.primaryContacts < 1) {
    nextActions.push('Merkitse yksi yhteyshenkilö ensisijaiseksi tarjousvastuuta varten.');
  }

  if (counts.activeCredentials < 1) {
    nextActions.push('Lisää vähintään yksi voimassa oleva pätevyys, vakuutus tai todistus.');
  }

  if (counts.responseTemplates < 1) {
    nextActions.push('Tallenna ainakin yksi vastauspohja toistuvia tarjousvastauksia varten.');
  }

  if (counts.documents < 1) {
    nextActions.push('Liitä profiiliin tukidokumenttien viitteet, jotta lähdemateriaali löytyy nopeasti.');
  }

  if (ready) {
    return {
      state: 'ready',
      label: 'Valmis analyysiin',
      summary: 'Tarjoajaprofiilissa on ydintiedot, yhteyshenkilö, käyttökelpoinen pätevyys ja vähintään yksi vastauspohja jatkoanalyysiä varten.',
      nextActions,
      counts,
    };
  }

  return {
    state: 'partial',
    label: 'Rakenteilla',
    summary: 'Tarjoajaprofiili on aloitettu, mutta se tarvitsee vielä täydentäviä tietoja ennen provider-aware analyysiä.',
    nextActions,
    counts,
  };
}