/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // These packages use Node-only APIs / dynamic requires, so they must not be bundled.
    serverComponentsExternalPackages: ['pdf-parse', 'tesseract.js', 'mammoth'],
  },
  async headers() {
    return [
      {
        // The browser must always re-check the service worker so updates reach users.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [{ key: 'Content-Type', value: 'application/manifest+json' }],
      },
    ];
  },
};

export default nextConfig;
