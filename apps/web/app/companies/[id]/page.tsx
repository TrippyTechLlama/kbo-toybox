import Link from 'next/link';
import { headers } from 'next/headers';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type CompanyDetail = {
  enterprise_number: string;
  status: string;
  juridical_situation: string;
  juridical_situation_label?: string | null;
  type_of_enterprise: string;
  type_of_enterprise_label?: string | null;
  juridical_form: string | null;
  juridical_form_label?: string | null;
  juridical_form_display?: string | null;
  juridical_form_cac: string | null;
  start_date: string | null;
  status_label?: string | null;
  denominations: { language: string; type_of_denomination: string; denomination: string }[];
  addresses: {
    type_of_address: string;
    country_nl: string | null;
    country_fr: string | null;
    zipcode: string | null;
    municipality_nl: string | null;
    municipality_fr: string | null;
    street_nl: string | null;
    street_fr: string | null;
    house_number: string | null;
    box: string | null;
    extra_address_info: string | null;
    date_striking_off: string | null;
  }[];
  contacts: { entity_contact: string; contact_type: string; value: string }[];
  activities: {
    activity_group: string;
    nace_version: number;
    nace_code: string;
    nace_label: string | null;
    classification: string;
  }[];
};

async function fetchCompany(id: string, acceptLanguage: string | null) {
  const res = await fetch(`${apiUrl}/companies/${encodeURIComponent(id)}`, {
    cache: 'no-store',
    headers: acceptLanguage ? { 'accept-language': acceptLanguage } : undefined,
  });
  if (!res.ok) {
    throw new Error('Failed to load company');
  }
  return res.json() as Promise<CompanyDetail>;
}

export default async function CompanyDetailPage({ params }: { params: { id: string } }) {
  const acceptLanguage = headers().get('accept-language');
  const detail = await fetchCompany(params.id, acceptLanguage);
  const primaryName = detail.denominations[0]?.denomination || 'Geen naam';

  return (
    <main className="page container stack">
      <Link className="link-btn" href="/companies">
        ← Terug naar overzicht
      </Link>

      <div className="panel stack">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="pill">#{detail.enterprise_number}</div>
          <span className="muted">{detail.start_date || 'Onbekende startdatum'}</span>
        </div>
        <h1>{primaryName}</h1>
        <div className="muted">
          Status: {detail.status_label || detail.status}
          {' • '}Juridische situatie: {detail.juridical_situation_label || detail.juridical_situation}
          {' • '}Type: {detail.type_of_enterprise_label || detail.type_of_enterprise}
        </div>
        <div className="muted">
          Rechtsvorm: {detail.juridical_form_display || 'n/a'}
          {detail.juridical_form_cac ? ` [${detail.juridical_form_cac}]` : ''}
        </div>
      </div>

      <div className="grid-two">
        <div className="panel">
          <h3>Benamingen</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Taal</th>
                <th>Type</th>
                <th>Naam</th>
              </tr>
            </thead>
            <tbody>
              {detail.denominations.map((d, i) => (
                <tr key={`${d.language}-${d.type_of_denomination}-${i}`}>
                  <td>{d.language}</td>
                  <td>{d.type_of_denomination}</td>
                  <td>{d.denomination}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <h3>Contact</h3>
          {detail.contacts.length === 0 ? (
            <div className="muted">Geen contactinfo</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Waarde</th>
                </tr>
              </thead>
              <tbody>
                {detail.contacts.map((c, i) => (
                  <tr key={`${c.contact_type}-${c.value}-${i}`}>
                    <td>{c.contact_type}</td>
                    <td>{c.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="grid-two">
        <div className="panel">
          <h3>Adres(sen)</h3>
          {detail.addresses.length === 0 ? (
            <div className="muted">Geen adressen</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Adres</th>
                  <th>Postcode</th>
                </tr>
              </thead>
              <tbody>
                {detail.addresses.map((a, i) => (
                  <tr key={`${a.type_of_address}-${i}`}>
                    <td>{a.type_of_address}</td>
                    <td>
                      {[a.street_nl || a.street_fr, a.house_number, a.box].filter(Boolean).join(' ')}
                      {a.municipality_nl || a.municipality_fr
                        ? `, ${a.municipality_nl || a.municipality_fr}`
                        : ''}
                      {a.country_nl || a.country_fr ? ` (${a.country_nl || a.country_fr})` : ''}
                    </td>
                    <td>{a.zipcode || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="panel">
          <h3>Activiteiten</h3>
          {detail.activities.length === 0 ? (
            <div className="muted">Geen activiteiten</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Groep</th>
                  <th>NACE</th>
                  <th>Omschrijving</th>
                  <th>Classificatie</th>
                </tr>
              </thead>
              <tbody>
                {detail.activities.map((a, i) => (
                  <tr key={`${a.activity_group}-${a.nace_code}-${i}`}>
                    <td>{a.activity_group}</td>
                    <td>
                      {a.nace_version}.{a.nace_code}
                    </td>
                    <td>{a.nace_label || '—'}</td>
                    <td>{a.classification}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
