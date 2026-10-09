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
  // Etapa T — rotas movidas no painel: redirecionamento HTTP antes do
  // render (E-books/Audiobooks viraram abas de Produtos; Obras saiu).
  async redirects() {
    return [
      {
        source: "/admin/e-books",
        destination: "/admin/produtos?tipo=ebook",
        permanent: true,
      },
      {
        source: "/admin/audiobooks",
        destination: "/admin/produtos?tipo=audiobook",
        permanent: true,
      },
      {
        source: "/admin/obras",
        destination: "/admin/produtos",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
