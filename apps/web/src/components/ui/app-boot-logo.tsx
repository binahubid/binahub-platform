import Image from "next/image";

export function AppBootLogo() {
  return (
    <div role="status" className="grid min-h-[100svh] place-items-center">
      <Image
        src="/intro2.png"
        alt=""
        width={1280}
        height={640}
        priority
        className="h-auto w-[min(76vw,300px)]"
      />
      <span className="sr-only">Membuka BinaHub AMS…</span>
    </div>
  );
}
