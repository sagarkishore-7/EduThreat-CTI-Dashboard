/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use standalone for Docker, default for Vercel
  ...(process.env.DOCKER_BUILD === '1' ? { output: 'standalone' } : {}),
  images: {
    unoptimized: true,
  },
  // Allow API requests to the backend
  async rewrites() {
    // Only apply rewrites in development (Vercel handles CORS via backend)
    if (process.env.NODE_ENV === 'development') {
      return [];
    }
    return [];
  },
  // The Investigations page is superseded by the whole-dataset Intel Graph under
  // Intelligence; redirect any lingering links.
  async redirects() {
    return [
      { source: '/investigations', destination: '/intel-graph', permanent: true },
    ];
  },
};

export default nextConfig;
