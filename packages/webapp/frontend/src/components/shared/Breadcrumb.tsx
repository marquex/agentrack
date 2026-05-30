import { Link } from "react-router";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-500">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {item.href ? (
            <Link
              to={item.href}
              className="hover:text-slate-700 transition-colors transition-normal focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring outline-none"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-900 font-medium">{item.label}</span>
          )}
          {index < items.length - 1 && (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
        </div>
      ))}
    </nav>
  );
}