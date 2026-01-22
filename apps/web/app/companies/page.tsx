import Link from 'next/link';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type CompanyListResponse = {
  items: {
    enterprise_number: string;
    status: string;
    juridical_form: string | null;
    start_date: string | null;
    names: string[];
  }[];
  total: number;
  page: number;
  pageSize: number;
};

async function fetchCompanies(search: string, page: number) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (page > 1) params.set('page', page.toString());
  params.set('pageSize', '12');

  const res = await fetch(`${apiUrl}/companies?${params.toString()}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Failed to load companies');
  }
  return res.json() as Promise<CompanyListResponse>;
}

function pageLink(page: number, search: string) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (page > 1) params.set('page', page.toString());
  const qs = params.toString();
  return qs ? `/companies?${qs}` : '/companies';
}

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: { search?: string; page?: string };
}) {
  const search = searchParams.search ? String(searchParams.search) : '';
  const page = searchParams.page ? Number(searchParams.page) || 1 : 1;
  const data = await fetchCompanies(search, page);
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <main className="page container">
      <h1>Companies</h1>
      <p className="lede">Zoek op ondernemingsnummer of (deel van) naam. Paginatie is inbegrepen.</p>

      <form className="panel stack" action="/companies" method="get">
        <div className="row">
          <input
            className="input"
            type="text"
            name="search"
            placeholder="Zoek bv. 0200.065.765 of bedrijfsnaam"
            defaultValue={search}
          />
          <button className="button" type="submit">
            Zoek
          </button>
        </div>
        <div className="muted">
          Totaal: {data.total} | Pagina {data.page} van {totalPages}
        </div>
      </form>

      <div className="list" style={{ marginTop: '1rem' }}>
        {data.items.map((item) => (
          <div key={item.enterprise_number} className="list-card">
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="pill">#{item.enterprise_number}</div>
              <span className="muted">{item.start_date || 'Onbekend'}</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>
              {item.names.length ? item.names[0] : 'Geen naam beschikbaar'}
            </div>
            <div className="muted">
              Status: {item.status} • Rechtsvorm: {item.juridical_form || 'n/a'}
            </div>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="muted" style={{ fontSize: '0.9rem' }}>
                {item.names.slice(1, 3).map((name) => (
                  <span key={name} style={{ display: 'inline-block', marginRight: '0.4rem' }}>
                    {name}
                  </span>
                ))}
              </div>
              <Link className="link-btn" href={`/companies/${encodeURIComponent(item.enterprise_number)}`}>
                Details
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="pagination">
        {page > 1 ? (
          <Link className="link-btn" href={pageLink(page - 1, search)}>
            ← Vorige
          </Link>
        ) : null}
        <span className="muted">
          Pagina {page} / {totalPages}
        </span>
        {page < totalPages ? (
          <Link className="link-btn" href={pageLink(page + 1, search)}>
            Volgende →
          </Link>
        ) : null}
      </div>
    </main>
  );
}
