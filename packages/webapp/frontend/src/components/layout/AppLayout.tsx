import { Header } from "./Header";
import { Breadcrumb } from "@/components/shared/Breadcrumb";

export function AppLayout({ children, pageTitle, breadcrumbs }: {
  children: React.ReactNode;
  pageTitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}) {
  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <Header />
      <main className="flex-1 overflow-auto">
        {/* Page Title and Breadcrumbs */}
        {pageTitle && (
          <div className="border-b bg-white">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">{pageTitle}</h1>
                  {breadcrumbs && <Breadcrumb items={breadcrumbs} />}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
