/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive',
          },
        ],
      },
    ];
  },
  // The Odoo backend base URL is read at runtime via process.env.ODOO_BASE_URL.
  // It is intentionally NOT a NEXT_PUBLIC_ var: the browser never talks to Odoo
  // directly. All backend traffic is proxied through Next.js route handlers
  // (the BFF layer) so the Odoo session cookie stays httpOnly and server-side.
};

export default nextConfig;
