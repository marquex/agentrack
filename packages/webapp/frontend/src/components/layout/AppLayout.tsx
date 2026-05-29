import { Header } from "./Header";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <Header />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
