/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@dfz/api', '@dfz/config', '@dfz/types'],
};

module.exports = nextConfig;
