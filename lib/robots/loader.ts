import type React from "react";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { mdxComponents } from "@/components/mdx/MDXComponents";

const ROBOTS_DIR = path.join(process.cwd(), "content", "robots");
const PAGE_FILE = "page.mdx";

export type RobotSection = { slug: string; label: string };

export type RobotResourceType = "doc" | "file";

export type RobotResource = {
  label: string;
  file: string;
  type?: RobotResourceType;
};

export type RobotUnit = {
  nickname: string;
  status: string;
  note?: string;
};

export type RobotMeta = {
  slug: string;
  name: string;
  nickname?: string;
  status: string;
  platform?: string;
  summary?: string;
  location?: string;
  lastChecked?: string;
  maintainers?: string[];
  thumbnail?: string;
  sections: RobotSection[];
  resources?: RobotResource[];
  units?: RobotUnit[];
};

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function getRobotSlugs(): string[] {
  return fs
    .readdirSync(ROBOTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

export function getAllRobotsMeta(): RobotMeta[] {
  return getRobotSlugs()
    .map((slug) => {
      try {
        return getRobotData(slug);
      } catch {
        return null;
      }
    })
    .filter((r): r is RobotMeta => r !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getRobotData(slug: string): RobotMeta {
  const file = path.join(ROBOTS_DIR, slug, PAGE_FILE);
  if (!fs.existsSync(file)) {
    throw new Error(`Missing ${PAGE_FILE} for robot: ${slug}`);
  }
  const raw = fs.readFileSync(file, "utf8");
  const { data, content } = matter(raw);

  const meta = data as {
    name?: string;
    status?: string;
    nickname?: string;
    platform?: string;
    summary?: string;
    location?: string;
    lastChecked?: string;
    maintainers?: string[];
    thumbnail?: string;
    resources?: RobotResource[];
    units?: RobotUnit[];
  };
  if (!meta?.name || !meta?.status) {
    throw new Error(`Missing required frontmatter for robot: ${slug}`);
  }

  const sections: RobotSection[] = [{ slug: "overview", label: "Overview" }];
  const h2Regex = /^##\s+(.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = h2Regex.exec(content)) !== null) {
    const label = m[1].trim();
    const slugId = slugify(label);
    if (slugId) sections.push({ slug: slugId, label });
  }

  return {
    slug,
    name: meta.name,
    nickname: meta.nickname,
    status: meta.status,
    platform: meta.platform,
    summary: meta.summary,
    location: meta.location,
    lastChecked: meta.lastChecked,
    maintainers: meta.maintainers,
    thumbnail: meta.thumbnail,
    sections,
    resources: meta.resources,
    units: meta.units,
  };
}

export function getRobotMeta(slug: string): Record<string, unknown> {
  return getRobotData(slug);
}

export function getRobotSections(slug: string): RobotSection[] {
  const data = getRobotData(slug);
  return data.sections;
}

export async function getRobotPageContent(
  slug: string,
): Promise<{ content: React.ReactNode } | null> {
  const file = path.join(ROBOTS_DIR, slug, PAGE_FILE);
  if (!fs.existsSync(file)) {
    return null;
  }
  const source = fs.readFileSync(file, "utf8");

  const { content } = await compileMDX({
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

  return { content };
}
