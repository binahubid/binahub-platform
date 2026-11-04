import type { ComponentProps, ReactNode } from 'react';
export function Link({ href, children, ...props }: ComponentProps<'a'>) { return <a href={href} {...props}>{children}</a>; }
export function Image({ src, alt, priority: _priority, ...props }: ComponentProps<'img'> & {priority?: boolean}) { return <img src={src} alt={alt} {...props}/>; }
export const usePathname = () => new URLSearchParams(location.search).has('associate') ? '/dashboard' : new URLSearchParams(location.search).has('reviewer') ? '/admin/reviews' : '/admin';
const router = { replace() {}, push() {}, refresh() {}, prefetch() {} };
export const useRouter = () => router;
export const useSearchParams = () => new URLSearchParams(location.search);
export function OnboardingProvider({children}: {children: ReactNode}) { return <>{children}</>; }
export function OnboardingModal() { return null; }
