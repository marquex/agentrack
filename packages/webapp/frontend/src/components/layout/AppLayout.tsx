import { Header } from "./Header";
import { Breadcrumb } from "@/components/shared/Breadcrumb";

export function AppLayout({ children, pageTitle, breadcrumbs, titleContent }: {
  children: React.ReactNode;
  pageTitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  /**
   * Optional custom node rendered in place of the default page title <h1>.
   * Use this when a page needs to own its title rendering (e.g. inline editing
   * or displaying an ID alongside the title). When omitted, falls back to the
   * static <h1>{pageTitle}</h1>.
   */
  titleContent?: React.ReactNode;
}) {
  const showHeader = pageTitle || breadcrumbs || titleContent;
  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <Header />
      <main className="flex-1 overflow-auto">
        {/* Page Title and Breadcrumbs */}
        {showHeader && (
          <div className="border-b bg-white">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  {titleContent
                    ? titleContent
                    : pageTitle && (
                        <h1 className="text-2xl font-bold text-slate-900">{pageTitle}</h1>
                      )}
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
