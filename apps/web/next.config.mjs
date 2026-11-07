/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  // @smart-plant/shared ships raw TypeScript (no build step), so it must be
  // run through Next's own compiler even though it resolves via node_modules.
  transpilePackages: ["@smart-plant/shared"],
  webpack: (config) => {
    // @smart-plant/shared's internal relative imports use explicit ".js"
    // extensions (TS ESM convention) while the files on disk are ".ts".
    // Webpack doesn't do this remapping by default; tell it to.
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".js", ".ts", ".tsx"],
    };
    return config;
  },
};

export default nextConfig;
