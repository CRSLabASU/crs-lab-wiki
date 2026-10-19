import { notFound } from "next/navigation";
import matter from "gray-matter";
import { requireEditor } from "@/lib/auth";
import { isValidSlug, readPage } from "@/lib/content";
import { RobotEditor } from "@/components/RobotEditor";

function robotName(content: string, fallback: string) {
  // Fall back to the slug so pages with broken frontmatter can still be fixed here.
  try {
    const { name } = matter(content).data as { name?: unknown };
    return typeof name === "string" && name ? name : fallback;
  } catch {
    return fallback;
  }
}

export default async function EditRobotPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isValidSlug(slug)) notFound();
  const email = await requireEditor(`/robots/${slug}/edit`);

  const page = await readPage(slug).catch((err) => {
    const { status, code } = err as { status?: number; code?: string };
    if (status === 404 || code === "ENOENT") notFound();
    throw err;
  });

  return (
    <RobotEditor
      slug={slug}
      name={robotName(page.content, slug)}
      email={email}
      initialContent={page.content}
      initialVersion={page.version}
    />
  );
}
