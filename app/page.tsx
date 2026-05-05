import DocChat from "@/components/DocChat";
import Image from "next/image";

export default function Home() {
  return (
    <div className="h-screen overflow-hidden bg-[#f3f2ef] text-slate-900">
      <header className="flex items-center gap-3 px-6 py-4">
        <Image src="/pci_logo.svg" alt="PCI TechLab logo" width={112} height={28} className="h-7 w-auto" />
      </header>

      <main className="mx-auto flex h-[calc(100vh-72px)] w-full max-w-5xl flex-col overflow-hidden px-6 pt-12 pb-10 lg:px-10">
        <div className="max-w-3xl">
          <h1 className="font-title text-5xl leading-none text-slate-900 sm:text-6xl lg:text-7xl">
            chat.bot
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-700 sm:text-lg">
            Tell us a little about what you need, then either type your reply or choose one of the options below.
          </p>
        </div>

        <div className="mt-auto w-full overflow-hidden pt-10">
          <DocChat />
        </div>
      </main>
    </div>
  );
}