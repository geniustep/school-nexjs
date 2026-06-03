import { loadOdooTarget } from './qa-env.mjs';

const t = loadOdooTarget();
console.log(
  JSON.stringify(
    {
      odooBaseUrl: t.odooBaseUrl,
      odooDb: t.odooDb,
      apiV1Base: `${t.odooBaseUrl}${t.apiPrefix}`,
      authEndpoint: `${t.odooBaseUrl}${t.authPath}`,
      nextAppBase: process.argv[2] ?? 'http://localhost:3001',
      nextLoginBff: `${process.argv[2] ?? 'http://localhost:3001'}/api/auth/login`,
      envSource: {
        odooBaseFrom: process.env.ODOO_BASE_URL ? 'process.env' : '.env file or default',
        odooDbFrom: process.env.ODOO_DB ? 'process.env' : '.env file or default',
      },
    },
    null,
    2,
  ),
);
