import DocChat from "@/components/DocChat";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <h1 className="text-2xl font-semibold mb-6 text-gray-700">
        Welcome to PCI - TechLab
      </h1>
      <DocChat />
    </main>
  );
}