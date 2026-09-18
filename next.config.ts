import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  serverExternalPackages: ["bcryptjs", "@prisma/client"],
};

export default nextConfig;
