import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/credit-guide",
        destination: "/credit-guide.html",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
