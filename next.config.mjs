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
  // The former Sankey-based Intel Graph is superseded by the entity-rooted
  // Investigations knowledge graph; redirect any lingering links.
  async redirects() {
    return [
      { source: '/intel-graph', destination: '/investigations', permanent: true },
    ];
  },
};

export default nextConfig;
