import matter from "gray-matter";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { mdxComponents } from "@/components/mdx/MDXComponents";

export type ValidationResult = { ok: true } | { ok: false; error: string };

export async function validateMDX(source: string): Promise<ValidationResult> {
  let parsed;
  try {
    parsed = matter(source);
  } catch (err) {
    return {
      ok: false,
      error: `Frontmatter parse failed: ${(err as Error).message}`,
    };
  }

  const fm = parsed.data as { name?: unknown; status?: unknown };
  if (!fm?.name || typeof fm.name !== "string") {
    return { ok: false, error: "Frontmatter missing required field: name" };
  }
  if (!fm?.status || typeof fm.status !== "string") {
    return { ok: false, error: "Frontmatter missing required field: status" };
  }

  try {
    await compileMDX({
      source,
      components: mdxComponents,
      options: {
        parseFrontmatter: true,
        mdxOptions: {
          remarkPlugins: [remarkGfm],
          rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings],
        },
      },
    });
  } catch (err) {
    return {
      ok: false,
      error: `MDX compile failed: ${(err as Error).message}`,
    };
  }

  return { ok: true };
}
