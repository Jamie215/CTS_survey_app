/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    trailingSlash: true,
    images: {
        unoptimized: true
    },
    // For portability across hosting platforms, set basePath if the app
    // is served from a subdirectory (e.g. basePath: '/cts-survey').
    // This affects all asset paths including images loaded via <Image>
    // and public folder references. When deploying to a new platform,
    // update this value or set it via NEXT_PUBLIC_BASE_PATH env var.
    // basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
};

export default nextConfig;
