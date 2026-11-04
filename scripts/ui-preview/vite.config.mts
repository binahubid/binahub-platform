import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.dirname(fileURLToPath(import.meta.url));
const runtime = createRequire(process.env.AMS_UI_RUNTIME || path.resolve(root, '../../../app-binahub/package.json'));
const web = path.resolve(root, '../../apps/web');
const webRequire = createRequire(path.join(web, 'package.json'));
const { defineConfig } = runtime('vite');
const react = runtime('@vitejs/plugin-react').default;
const tailwind = webRequire(path.join(web,'tailwind.config.js'));
export default defineConfig({ root, publicDir: path.join(web, 'public'), envDir: root,
  define: { 'process.env.NEXT_PUBLIC_API_URL': JSON.stringify('http://127.0.0.1:4322') },
  plugins: [{ name: 'local-fixtures', enforce: 'pre', resolveId(id: string) {
    if (id.endsWith('/context/AuthContext')) return path.join(root, 'mock-auth.ts');
    if (id.endsWith('/onboarding/context') || id.endsWith('/onboarding/onboarding-modal')) return path.join(root, 'mock-next.tsx');
  } }, react()],
  resolve: { dedupe: ['react','react-dom'], alias: [
    {find:'next/link',replacement:path.join(root,'link.ts')}, {find:'next/image',replacement:path.join(root,'image.ts')}, {find:'next/navigation',replacement:path.join(root,'mock-next.tsx')},
    {find:/^react-dom\/client$/,replacement:runtime.resolve('react-dom/client')}, {find:/^react-dom$/,replacement:runtime.resolve('react-dom')}, {find:/^react$/,replacement:runtime.resolve('react')},
    {find:/^react\/jsx-runtime$/,replacement:runtime.resolve('react/jsx-runtime')}, {find:/^react\/jsx-dev-runtime$/,replacement:runtime.resolve('react/jsx-dev-runtime')},
  ] }, css: { postcss: { plugins: [webRequire('tailwindcss')({...tailwind,content:[path.join(web,'src/**/*.{js,ts,jsx,tsx,mdx}'),path.join(root,'*.tsx')]}),webRequire('autoprefixer')()] } },
  server: { host:'127.0.0.1', port:4322, strictPort:true, fs:{allow:[path.resolve(root,'../..'),path.resolve(root,'../../../app-binahub')]} },
});
