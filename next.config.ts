import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["firebase-admin"],
  images: {
    // imagens enviadas pelo painel ficam no Cloudinary
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
    ],
  },
  headers() {
    return [
      {
        // manifesto de versão do app — lido pelo app mobile (cross-origin)
        // e pela própria página /download (same origin)
        source: "/app-version.json",
        headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
      },
    ];
  },
};

export default nextConfig;
