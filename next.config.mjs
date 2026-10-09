/** @type {import('next').NextConfig} */
// Static export is applied to production builds only (`npm run build`). The dev server runs normally,
// which avoids Next's dev-time "output: export" restrictions on dynamic and metadata routes.
const isProductionBuild = process.env.NODE_ENV === "production";

const nextConfig = {
  // Fully static export: the site ships as plain HTML/CSS/JS, which is the fastest option for
  // 2G/3G networks and deploys straight to Cloudflare Pages from the `out/` folder.
  output: isProductionBuild ? "export" : undefined,
  trailingSlash: false,
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Static export has no image optimiser; images are pre-sized in /public.
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
