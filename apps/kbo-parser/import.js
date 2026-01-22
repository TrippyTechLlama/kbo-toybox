const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const { Client } = require('pg');
const copyFrom = require('pg-copy-streams').from;

const DEFAULT_CONN = 'postgres://kbo:kbo@localhost:5432/kbo';
const FILES_DIR = process.env.KBO_FILES_DIR || path.join(__dirname, 'files');

const createSchemasSql = `
  create schema if not exists kbo_stg;
  create schema if not exists kbo;
`;

const createFinalTablesSql = `
create table if not exists kbo.code (
  category text not null,
  code text not null,
  language text not null,
  description text not null,
  primary key (category, code, language)
);

create table if not exists kbo.enterprise (
  enterprise_number text primary key,
  status text not null,
  juridical_situation text not null,
  type_of_enterprise text not null,
  juridical_form text null,
  juridical_form_cac text null,
  start_date date not null
);

create table if not exists kbo.establishment (
  establishment_number text primary key,
  start_date date not null,
  enterprise_number text not null references kbo.enterprise(enterprise_number)
);

create table if not exists kbo.branch (
  id text primary key,
  start_date date not null,
  enterprise_number text not null references kbo.enterprise(enterprise_number)
);

create table if not exists kbo.denomination (
  entity_number text not null,
  language text not null,
  type_of_denomination text not null,
  denomination text not null,
  primary key (entity_number, language, type_of_denomination, denomination)
);

create table if not exists kbo.address (
  entity_number text not null,
  type_of_address text not null,
  country_nl text null,
  country_fr text null,
  zipcode text null,
  municipality_nl text null,
  municipality_fr text null,
  street_nl text null,
  street_fr text null,
  house_number text null,
  box text null,
  extra_address_info text null,
  date_striking_off date null
);

create index if not exists idx_address_entity on kbo.address(entity_number);

create table if not exists kbo.contact (
  entity_number text not null,
  entity_contact text not null,
  contact_type text not null,
  value text not null,
  primary key (entity_number, entity_contact, contact_type, value)
);

create table if not exists kbo.activity (
  entity_number text not null,
  activity_group text not null,
  nace_version int not null,
  nace_code text not null,
  classification text not null,
  primary key (entity_number, activity_group, nace_version, nace_code, classification)
);

create index if not exists idx_activity_entity on kbo.activity(entity_number);
create index if not exists idx_activity_nace on kbo.activity(nace_version, nace_code);

create table if not exists kbo.extract_meta (
  variable text primary key,
  value text not null
);
`;

// If tables already existed with stricter constraints (e.g. juridical_form NOT NULL),
// relax them so the current schema matches what we expect.
const relaxConstraintsSql = `
  alter table if exists kbo.enterprise
    alter column juridical_form drop not null;
`;

const createStagingTablesSql = `
create table if not exists kbo_stg.code (
  "Category" text,
  "Code" text,
  "Language" text,
  "Description" text
);

create table if not exists kbo_stg.enterprise (
  "EnterpriseNumber" text,
  "Status" text,
  "JuridicalSituation" text,
  "TypeOfEnterprise" text,
  "JuridicalForm" text,
  "JuridicalFormCAC" text,
  "StartDate" text
);

create table if not exists kbo_stg.establishment (
  "EstablishmentNumber" text,
  "StartDate" text,
  "EnterpriseNumber" text
);

create table if not exists kbo_stg.branch (
  "Id" text,
  "StartDate" text,
  "EnterpriseNumber" text
);

create table if not exists kbo_stg.denomination (
  "EntityNumber" text,
  "Language" text,
  "TypeOfDenomination" text,
  "Denomination" text
);

create table if not exists kbo_stg.address (
  "EntityNumber" text,
  "TypeOfAddress" text,
  "CountryNL" text,
  "CountryFR" text,
  "Zipcode" text,
  "MunicipalityNL" text,
  "MunicipalityFR" text,
  "StreetNL" text,
  "StreetFR" text,
  "HouseNumber" text,
  "Box" text,
  "ExtraAddressInfo" text,
  "DateStrikingOff" text
);

create table if not exists kbo_stg.contact (
  "EntityNumber" text,
  "EntityContact" text,
  "ContactType" text,
  "Value" text
);

create table if not exists kbo_stg.activity (
  "EntityNumber" text,
  "ActivityGroup" text,
  "NaceVersion" text,
  "NaceCode" text,
  "Classification" text
);

create table if not exists kbo_stg.meta (
  "Variable" text,
  "Value" text
);

create table if not exists kbo_stg.nacebel2025 (
  "LEVEL" text,
  "CODE" text,
  "NATIONAL_TITLE_BE_NL" text,
  "NATIONAL_TITLE_BE_FR" text,
  "NATIONAL_TITLE_BE_DE" text,
  "NATIONAL_TITLE_BE_EN" text
);
`;

const copyJobs = [
  {
    table: 'kbo_stg.code',
    columns: '"Category","Code","Language","Description"',
    file: 'code.csv',
  },
  {
    table: 'kbo_stg.enterprise',
    columns:
      '"EnterpriseNumber","Status","JuridicalSituation","TypeOfEnterprise","JuridicalForm","JuridicalFormCAC","StartDate"',
    file: 'enterprise.csv',
  },
  {
    table: 'kbo_stg.establishment',
    columns: '"EstablishmentNumber","StartDate","EnterpriseNumber"',
    file: 'establishment.csv',
  },
  {
    table: 'kbo_stg.branch',
    columns: '"Id","StartDate","EnterpriseNumber"',
    file: 'branch.csv',
  },
  {
    table: 'kbo_stg.denomination',
    columns: '"EntityNumber","Language","TypeOfDenomination","Denomination"',
    file: 'denomination.csv',
  },
  {
    table: 'kbo_stg.address',
    columns:
      '"EntityNumber","TypeOfAddress","CountryNL","CountryFR","Zipcode","MunicipalityNL","MunicipalityFR","StreetNL","StreetFR","HouseNumber","Box","ExtraAddressInfo","DateStrikingOff"',
    file: 'address.csv',
  },
  {
    table: 'kbo_stg.contact',
    columns: '"EntityNumber","EntityContact","ContactType","Value"',
    file: 'contact.csv',
  },
  {
    table: 'kbo_stg.activity',
    columns: '"EntityNumber","ActivityGroup","NaceVersion","NaceCode","Classification"',
    file: 'activity.csv',
  },
  {
    table: 'kbo_stg.meta',
    columns: '"Variable","Value"',
    file: 'meta.csv',
  },
  {
    table: 'kbo_stg.nacebel2025',
    columns:
      '"LEVEL","CODE","NATIONAL_TITLE_BE_NL","NATIONAL_TITLE_BE_FR","NATIONAL_TITLE_BE_DE","NATIONAL_TITLE_BE_EN"',
    file: 'NACEBEL_2025.csv',
  },
];

const transformSql = `
insert into kbo.code(category, code, language, description)
select "Category", "Code", "Language", "Description"
from kbo_stg.code
where "Category" is not null
on conflict (category, code, language) do update
set description = excluded.description;

insert into kbo.code(category, code, language, description)
select
  'NACEBEL_2025' as category,
  n."CODE",
  lang,
  desc_text
from kbo_stg.nacebel2025 n
cross join lateral (
  values
    ('NL', nullif(n."NATIONAL_TITLE_BE_NL", '')),
    ('FR', nullif(n."NATIONAL_TITLE_BE_FR", '')),
    ('DE', nullif(n."NATIONAL_TITLE_BE_DE", '')),
    ('EN', nullif(n."NATIONAL_TITLE_BE_EN", ''))
) as v(lang, desc_text)
where n."CODE" is not null
  and desc_text is not null
on conflict (category, code, language) do update
set description = excluded.description;

insert into kbo.enterprise(
  enterprise_number, status, juridical_situation, type_of_enterprise,
  juridical_form, juridical_form_cac, start_date
)
select
  "EnterpriseNumber",
  "Status",
  "JuridicalSituation",
  "TypeOfEnterprise",
  "JuridicalForm",
  nullif("JuridicalFormCAC",''),
  to_date("StartDate",'DD-MM-YYYY')
from kbo_stg.enterprise
where "EnterpriseNumber" is not null
on conflict (enterprise_number) do update set
  status = excluded.status,
  juridical_situation = excluded.juridical_situation,
  type_of_enterprise = excluded.type_of_enterprise,
  juridical_form = excluded.juridical_form,
  juridical_form_cac = excluded.juridical_form_cac,
  start_date = excluded.start_date;

insert into kbo.establishment(establishment_number, start_date, enterprise_number)
select
  "EstablishmentNumber",
  to_date("StartDate",'DD-MM-YYYY'),
  "EnterpriseNumber"
from kbo_stg.establishment
where "EstablishmentNumber" is not null
on conflict (establishment_number) do update set
  start_date = excluded.start_date,
  enterprise_number = excluded.enterprise_number;

insert into kbo.branch(id, start_date, enterprise_number)
select
  "Id",
  to_date("StartDate",'DD-MM-YYYY'),
  "EnterpriseNumber"
from kbo_stg.branch
where "Id" is not null
on conflict (id) do update set
  start_date = excluded.start_date,
  enterprise_number = excluded.enterprise_number;

insert into kbo.denomination(entity_number, language, type_of_denomination, denomination)
select
  "EntityNumber",
  "Language",
  "TypeOfDenomination",
  "Denomination"
from kbo_stg.denomination
where "EntityNumber" is not null
on conflict do nothing;

insert into kbo.address(
  entity_number, type_of_address, country_nl, country_fr, zipcode,
  municipality_nl, municipality_fr, street_nl, street_fr,
  house_number, box, extra_address_info, date_striking_off
)
select
  "EntityNumber",
  "TypeOfAddress",
  nullif("CountryNL",''),
  nullif("CountryFR",''),
  nullif("Zipcode",''),
  nullif("MunicipalityNL",''),
  nullif("MunicipalityFR",''),
  nullif("StreetNL",''),
  nullif("StreetFR",''),
  nullif("HouseNumber",''),
  nullif("Box",''),
  nullif("ExtraAddressInfo",''),
  case when nullif("DateStrikingOff",'') is null then null
       else to_date("DateStrikingOff",'DD-MM-YYYY')
  end
from kbo_stg.address
where "EntityNumber" is not null;

insert into kbo.contact(entity_number, entity_contact, contact_type, value)
select
  "EntityNumber",
  "EntityContact",
  "ContactType",
  "Value"
from kbo_stg.contact
where "EntityNumber" is not null
on conflict do nothing;

insert into kbo.activity(entity_number, activity_group, nace_version, nace_code, classification)
select
  "EntityNumber",
  "ActivityGroup",
  ("NaceVersion")::int,
  "NaceCode",
  "Classification"
from kbo_stg.activity
where "EntityNumber" is not null
on conflict do nothing;

insert into kbo.extract_meta(variable, value)
select "Variable", "Value"
from kbo_stg.meta
where "Variable" is not null
on conflict (variable) do update set
  value = excluded.value;
`;

async function runSql(client, sql, label) {
  console.log(`→ ${label}`);
  await client.query(sql);
}

async function copyCsv(client, job) {
  const filePath = path.join(FILES_DIR, job.file);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing file: ${filePath}`);
  }

  console.log(`→ Truncate ${job.table}`);
  await client.query(`truncate ${job.table};`);

  console.log(`→ Copy ${job.file} into ${job.table}`);
  const copyStream = client.query(
    copyFrom(`copy ${job.table} (${job.columns}) from stdin with (format csv, header true, delimiter ',', quote '\"', escape '\"')`)
  );

  await pipeline(fs.createReadStream(filePath), copyStream);
}

async function main() {
  const connectionString = process.env.DATABASE_URL || DEFAULT_CONN;
  const client = new Client({ connectionString });

  await client.connect();
  console.log(`Connected to ${connectionString}`);

  try {
    await runSql(client, createSchemasSql, 'Create schemas');
    await runSql(client, createFinalTablesSql, 'Create final tables');
    await runSql(client, relaxConstraintsSql, 'Relax constraints');
    await runSql(client, createStagingTablesSql, 'Create staging tables');

    for (const job of copyJobs) {
      await copyCsv(client, job);
    }

    await runSql(client, transformSql, 'Transform staging -> final');

    console.log('Done. Sanity counts:');
    const tables = ['kbo.enterprise', 'kbo.establishment', 'kbo.address', 'kbo.contact', 'kbo.activity'];
    for (const table of tables) {
      const { rows } = await client.query(`select count(*)::int as count from ${table};`);
      console.log(`  ${table}: ${rows[0].count}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
