import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server Action arguments can include passwords and private message bodies.
  logging: { serverFunctions: false },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
