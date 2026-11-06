import Link from "next/link";
import { FileText, ExternalLink } from "lucide-react";

interface ResourceLinkProps {
  href: string;
  children: React.ReactNode;
}

export function ResourceLink({ href, children }: ResourceLinkProps) {
  const isExternal = href.startsWith("http");
  const Icon = isExternal ? ExternalLink : FileText;

  return (
    <Link
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline dark:text-blue-400"
    >
      <Icon className="size-4" />
      {children}
    </Link>
  );
}
