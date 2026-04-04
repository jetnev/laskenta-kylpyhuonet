import { useMemo, useState } from 'react';
import type { OrganizationRole } from '../../lib/supabase';
import type { LegalAcceptanceSource } from '../../lib/supabase';
import type { RequiredLegalDocument } from '../../lib/legal';
import { getLegalAcceptanceSourceLabel, getLegalDocumentTypeLabel } from '../../lib/legal';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import LegalDocumentLinks from './LegalDocumentLinks';

interface LegalAcceptanceGateProps {
  organizationName?: string | null;
  organizationRole?: OrganizationRole | null;
  pendingDocuments: RequiredLegalDocument[];
  acceptanceSource: LegalAcceptanceSource;
  submitting: boolean;
  error?: string | null;
  onAccept: (options: { acceptOnBehalfOfOrganization: boolean }) => Promise<void>;
  onLogout: () => Promise<void>;
}

export default function LegalAcceptanceGate({
  organizationName,
  organizationRole,
  pendingDocuments,
  acceptanceSource,
  submitting,
  error,
  onAccept,
  onLogout,
}: LegalAcceptanceGateProps) {
  const [acceptedTermsAndPrivacy, setAcceptedTermsAndPrivacy] = useState(false);
  const [acceptedDpa, setAcceptedDpa] = useState(false);
  const [authorityConfirmed, setAuthorityConfirmed] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const hasTermsOrPrivacyPending = useMemo(
    () => pendingDocuments.some((document) => document.document_type === 'terms' || document.document_type === 'privacy'),
    [pendingDocuments]
  );
  const hasDpaPending = useMemo(
    () => pendingDocuments.some((document) => document.document_type === 'dpa'),
    [pendingDocuments]
  );
  const requiresAuthorityConfirmation = hasDpaPending && organizationRole === 'owner';

  const heading =
    acceptanceSource === 'invited-user-first-login'
      ? 'Hyväksy ajantasaiset ehdot ennen jatkamista'
      : 'Palvelun sopimusasiakirjat ovat päivittyneet';

  const description =
    acceptanceSource === 'invited-user-first-login'
      ? 'Ensimmäinen kirjautuminen edellyttää henkilökohtaista hyväksyntää ennen kuin työtilan käyttö jatkuu.'
      : 'Palvelun käyttö on rajoitettu, kunnes ajantasainen dokumenttiversio on hyväksytty.';

  const handleAccept = async () => {
    setLocalError(null);

    if (hasTermsOrPrivacyPending && !acceptedTermsAndPrivacy) {
      setLocalError('Hyväksy käyttöehdot ja vahvista lukeneesi tietosuojaselosteen.');
      return;
    }

    if (hasDpaPending && !acceptedDpa) {
      setLocalError('Hyväksy ajantasainen tietojenkäsittelyliite jatkaaksesi.');
      return;
    }

    if (requiresAuthorityConfirmation && !authorityConfirmed) {
      setLocalError('Vahvista oikeutesi hyväksyä ehdot organisaation puolesta.');
      return;
    }

    await onAccept({ acceptOnBehalfOfOrganization: requiresAuthorityConfirmation });
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] px-6 py-10 text-slate-950 sm:py-16">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="space-y-3">
          <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
            {getLegalAcceptanceSourceLabel(acceptanceSource)}
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">{heading}</h1>
          <p className="max-w-3xl text-base leading-8 text-slate-600">{description}</p>
        </div>

        <Card className="space-y-6 rounded-[28px] border-slate-200/90 bg-white p-6 shadow-[0_28px_70px_-46px_rgba(15,23,42,0.4)] sm:p-8">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {pendingDocuments.map((document) => (
                <Badge key={document.id} variant="secondary">
                  {getLegalDocumentTypeLabel(document.document_type)} · {document.version_label}
                </Badge>
              ))}
            </div>
            <p className="text-sm leading-7 text-slate-600">
              Avaa dokumentit uuteen välilehteen, tarkista ajantasainen versio ja hyväksy alla näkyvät ehdot jatkaaksesi palvelun käyttöä.
            </p>
            <LegalDocumentLinks openInNewTab />
          </div>

          {organizationRole === 'employee' && organizationName && (
            <Alert>
              <AlertDescription>
                Käytät työtilaa {organizationName}. Organisaation omistaja vastaa organisaatiotason sopimuksista erikseen, mutta sinun tulee silti hyväksyä käyttäjäkohtaiset käyttöehdot ennen jatkamista.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-5 rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
            {hasTermsOrPrivacyPending && (
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={acceptedTermsAndPrivacy}
                  id="accept-terms-and-privacy"
                  onCheckedChange={(checked) => setAcceptedTermsAndPrivacy(checked === true)}
                />
                <div className="space-y-1">
                  <Label className="cursor-pointer text-sm leading-6 text-slate-800" htmlFor="accept-terms-and-privacy">
                    Hyväksyn käyttöehdot ja vahvistan lukeneeni tietosuojaselosteen
                  </Label>
                  <p className="text-xs leading-6 text-slate-500">
                    Tämä hyväksyntä on pakollinen ennen palvelun käytön jatkamista.
                  </p>
                </div>
              </div>
            )}

            {hasDpaPending && (
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={acceptedDpa}
                  id="accept-dpa"
                  onCheckedChange={(checked) => setAcceptedDpa(checked === true)}
                />
                <div className="space-y-1">
                  <Label className="cursor-pointer text-sm leading-6 text-slate-800" htmlFor="accept-dpa">
                    Hyväksyn ajantasaisen tietojenkäsittelyliitteen siltä osin kuin palvelussa käsitellään organisaationi henkilötietoja
                  </Label>
                  <p className="text-xs leading-6 text-slate-500">
                    Tämä hyväksyntä koskee yritysasiakkaan roolia rekisterinpitäjänä ja palveluntarjoajan roolia käsittelijänä.
                  </p>
                </div>
              </div>
            )}

            {requiresAuthorityConfirmation && (
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={authorityConfirmed}
                  id="accept-authority"
                  onCheckedChange={(checked) => setAuthorityConfirmed(checked === true)}
                />
                <div className="space-y-1">
                  <Label className="cursor-pointer text-sm leading-6 text-slate-800" htmlFor="accept-authority">
                    Vakuutan, että minulla on oikeus hyväksyä ehdot organisaation puolesta.
                  </Label>
                  <p className="text-xs leading-6 text-slate-500">
                    Tätä vahvistusta käytetään organisaatiotason audit trailissa.
                  </p>
                </div>
              </div>
            )}
          </div>

          {(error || localError) && (
            <Alert variant="destructive">
              <AlertDescription>{error || localError}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => void onLogout()} disabled={submitting}>
              Kirjaudu ulos
            </Button>
            <Button type="button" onClick={() => void handleAccept()} disabled={submitting}>
              {submitting ? 'Tallennetaan hyväksyntää...' : 'Hyväksy ja jatka'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
