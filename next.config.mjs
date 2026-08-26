/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // ffmpeg-static porta un binario nativo: non va impacchettato dal bundler,
    // va caricato a runtime — e va incluso a mano nella funzione serverless.
    serverComponentsExternalPackages: ["ffmpeg-static"],
    outputFileTracingIncludes: {
      "/api/copy": ["./node_modules/ffmpeg-static/**"],
    },
  },
};
export default nextConfig;
