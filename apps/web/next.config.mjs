/** Site 100% estático: sem renderização no servidor e sem Server Actions. */
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
