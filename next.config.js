/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: '/', destination: '/index.html' },
      { source: '/about', destination: '/about.html' },
      { source: '/blog', destination: '/blog.html' },
      { source: '/book-now', destination: '/book-now.html' },
      { source: '/contact', destination: '/contact.html' },
      { source: '/gallery', destination: '/gallery.html' },
      { source: '/our-policies', destination: '/our-policies.html' },
      { source: '/reviews', destination: '/reviews.html' },
      { source: '/post/:slug', destination: '/post/:slug.html' },
      { source: '/resources/:file', destination: '/resources/:file.html' },
    ];
  },
};

module.exports = nextConfig;
