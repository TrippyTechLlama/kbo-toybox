import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from './db.service';

export interface CompanyListItem {
  enterprise_number: string;
  status: string;
  juridical_form: string | null;
  start_date: string | null;
  names: string[];
  juridical_form_group?: string;
}

export interface CompanyListResponse {
  items: CompanyListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CompanyDetail {
  enterprise_number: string;
  status: string;
  status_label?: string | null;
  juridical_situation: string;
  juridical_situation_label?: string | null;
  type_of_enterprise: string;
  type_of_enterprise_label?: string | null;
  juridical_form: string | null;
  juridical_form_label?: string | null;
  juridical_form_display?: string | null;
  juridical_form_cac: string | null;
  start_date: string | null;
  juridical_form_group?: string;
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
}

@Injectable()
export class CompaniesService {
  constructor(private readonly db: DbService) {}

  private sanitizePagination(page?: string, pageSize?: string) {
    const safePage = Math.max(1, Number.parseInt(page || '1', 10) || 1);
    const parsedPageSize = Number.parseInt(pageSize || '20', 10);
    const safePageSize = Math.min(Math.max(1, parsedPageSize || 20), 100);
    return { page: safePage, pageSize: safePageSize };
  }

  private classifyJuridicalForm(
    form?: string | null,
    typeOfEnterprise?: string | null,
    formLabel?: string | null,
    typeLabel?: string | null,
  ) {
    const raw = (form || '').toUpperCase();
    const label = (formLabel || '').toUpperCase();
    const type = (typeOfEnterprise || '').toUpperCase();
    const typeLbl = (typeLabel || '').toUpperCase();

    const haystack = `${raw} ${label}`;

    if (!raw && !label && (type.includes('NATUURL') || typeLbl.includes('NATUURL'))) return 'Eenmanszaak';
    if (haystack.includes('EENMANS') || haystack.includes('NATUURL')) return 'Eenmanszaak';
    if (haystack.includes('BVBA') || haystack.includes('B.V.B.A') || haystack.includes('BV')) return 'BV';
    if (haystack.includes('NV')) return 'NV';
    if (haystack.includes('CVBA') || haystack.includes('C.V.B.A') || haystack.includes('CV')) return 'CV';
    if (haystack.includes('COMM.V') || haystack.includes('COMMAND')) return 'CommV';
    if (haystack.includes('VZW') || haystack.includes('VERENIGING ZONDER WINST') || haystack.includes('ASBL'))
      return 'VZW';
    if (haystack.includes('STICHTING') || haystack.includes('FONDATION')) return 'Stichting';

    return raw || label || 'Onbekend';
  }

  private async resolveLabel(category: string, code?: string | null, preferredLang?: string) {
    if (!code) return null;
    const langs = this.languageOrder(preferredLang);
    const res = await this.db.query<{ description: string }>(
      `select description
       from kbo.code
       where category = $1 and code = $2
       order by
         (language = $3) desc,
         (language = $4) desc,
         (language = $5) desc,
         (language = $6) desc,
         language asc
       limit 1`,
      [category, code, ...langs],
    );
    return res.rows[0]?.description || null;
  }

  private async resolveStatus(code?: string | null, preferredLang?: string) {
    // KBO status codes live in kbo.code as category 'Status'
    if (!code) return null;
    const langs = this.languageOrder(preferredLang);
    const res = await this.db.query<{ description: string }>(
      `select description
       from kbo.code
       where category = 'Status' and code = $1
       order by
         (language = $2) desc,
         (language = $3) desc,
         (language = $4) desc,
         (language = $5) desc,
         language asc
       limit 1`,
      [code, ...langs],
    );
    return res.rows[0]?.description || null;
  }

  private languageOrder(preferred?: string) {
    const base = ['NL', 'FR', 'DE', 'EN'];
    if (!preferred) return base;
    const norm = preferred.split(',')[0]?.trim().slice(0, 2).toUpperCase();
    if (!norm) return base;
    const ordered = [norm, ...base];
    return Array.from(new Set(ordered));
  }

  async list(search?: string, page?: string, pageSize?: string): Promise<CompanyListResponse> {
    const { page: pageNum, pageSize: size } = this.sanitizePagination(page, pageSize);
    const offset = (pageNum - 1) * size;

    const params: any[] = [];
    let where = '';
    if (search && search.trim().length > 0) {
      const term = `%${search.trim()}%`;
      params.push(term, term);
      where = `where e.enterprise_number ilike $1 or exists (
        select 1 from kbo.denomination d where d.entity_number = e.enterprise_number and d.denomination ilike $2
      )`;
    }

    const countSql = `select count(*)::int as count from kbo.enterprise e ${where}`;
    const countResult = await this.db.query<{ count: number }>(countSql, params);
    const total = countResult.rows[0]?.count || 0;

    const listParams = [...params, size, offset];
    const baseParamIndex = params.length;
    const listSql = `
      select
        e.enterprise_number,
        e.status,
        e.juridical_form,
        to_char(e.start_date, 'YYYY-MM-DD') as start_date,
        coalesce(array_agg(distinct d.denomination) filter (where d.denomination is not null), '{}') as names
      from kbo.enterprise e
      left join kbo.denomination d on d.entity_number = e.enterprise_number
      ${where}
      group by e.enterprise_number, e.status, e.juridical_form, e.start_date
      order by e.start_date desc nulls last, e.enterprise_number
      limit $${baseParamIndex + 1} offset $${baseParamIndex + 2};
    `;

    const listResult = await this.db.query<CompanyListItem>(listSql, listParams);
    const items = listResult.rows.map((row) => ({
      ...row,
      juridical_form_group: this.classifyJuridicalForm(row.juridical_form),
    }));

    return { items, total, page: pageNum, pageSize: size };
  }

  async detail(enterpriseNumber: string, preferredLang?: string): Promise<CompanyDetail> {
    const enterpriseRes = await this.db.query(
      `
      select
        enterprise_number,
        status,
        juridical_situation,
        type_of_enterprise,
        juridical_form,
        juridical_form_cac,
        to_char(start_date, 'YYYY-MM-DD') as start_date
      from kbo.enterprise
      where enterprise_number = $1
    `,
      [enterpriseNumber],
    );

    const enterprise = enterpriseRes.rows[0];
    if (!enterprise) {
      throw new NotFoundException(`Enterprise ${enterpriseNumber} not found`);
    }

    const [
      denomRes,
      addrRes,
      contactRes,
      activityRes,
      jurFormLabel,
      jurSitLabel,
      typeLabel,
      statusLabel,
    ] = await Promise.all([
      this.db.query(
        `select language, type_of_denomination, denomination
         from kbo.denomination
         where entity_number = $1
         order by language, type_of_denomination`,
        [enterpriseNumber],
      ),
      this.db.query(
        `select
           type_of_address,
           country_nl, country_fr, zipcode,
           municipality_nl, municipality_fr,
           street_nl, street_fr,
           house_number, box, extra_address_info,
           to_char(date_striking_off, 'YYYY-MM-DD') as date_striking_off
         from kbo.address
         where entity_number = $1`,
        [enterpriseNumber],
      ),
      this.db.query(
        `select entity_contact, contact_type, value
         from kbo.contact
         where entity_number = $1`,
        [enterpriseNumber],
      ),
      this.db.query(
        `select
           a.activity_group,
           a.nace_version,
           a.nace_code,
           c.description as nace_label,
           a.classification
         from kbo.activity a
         left join lateral (
           select description
           from kbo.code c
           where c.code = a.nace_code
             and c.category ilike 'NACE%'
           order by
             (c.category = 'NACEBEL_2025') desc,
             (c.language = $2) desc,
             (c.language = $3) desc,
             (c.language = $4) desc,
             (c.language = $5) desc,
             c.language asc
           limit 1
         ) c on true
         where entity_number = $1`,
        [enterpriseNumber, ...this.languageOrder(preferredLang)],
      ),
      this.resolveLabel('JuridicalForm', enterprise.juridical_form, preferredLang),
      this.resolveLabel('JuridicalSituation', enterprise.juridical_situation, preferredLang),
      this.resolveLabel('TypeOfEnterprise', enterprise.type_of_enterprise, preferredLang),
      this.resolveStatus(enterprise.status, preferredLang),
    ]);

    const classifiedForm = this.classifyJuridicalForm(
      enterprise.juridical_form,
      enterprise.type_of_enterprise,
      jurFormLabel,
      typeLabel,
    );
    const juridicalFormDisplay =
      (classifiedForm && classifiedForm !== 'Onbekend' ? classifiedForm : null) ||
      jurFormLabel ||
      enterprise.juridical_form;

    return {
      ...enterprise,
      juridical_form_label: jurFormLabel,
      juridical_situation_label: jurSitLabel,
      type_of_enterprise_label: typeLabel,
      status_label: statusLabel,
      juridical_form_group: classifiedForm || undefined,
      juridical_form_display: juridicalFormDisplay,
      denominations: denomRes.rows,
      addresses: addrRes.rows,
      contacts: contactRes.rows,
      activities: activityRes.rows,
    };
  }
}
