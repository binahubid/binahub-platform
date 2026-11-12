import Image from "next/image";

export function AppBootLogo() {
  return (
    <div role="status" className="grid min-h-[100svh] place-items-center">
      <Image
        src="/full-logo.png"
        alt=""
        width={158}
        height={45}
        priority
        className="h-auto w-[158px]"
      />
      <span className="sr-only">Membuka BinaHub AMS…</span>
    </div>
  );
}
