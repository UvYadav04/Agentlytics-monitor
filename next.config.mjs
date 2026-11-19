/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/monitoring";

const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  poweredByHeader: false,
  basePath: basePath === "/" ? "" : basePath,
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
};

export default nextConfig;

