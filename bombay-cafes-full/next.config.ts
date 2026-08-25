import type { NextConfig } from "next";

/**
 * Photography is served as plain <img> from operator-owned origins and from
 * /api/place-photo, so next/image's remote allowlist is deliberately narrow.
 * There is no stock-photo host here on purpose: a generic interior under a
 * cafe's name is a false claim about that cafe.
 */
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }],
  },
};

export default nextConfig;
