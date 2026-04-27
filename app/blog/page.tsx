import type { Metadata } from "next";
import Link from "next/link";
import { Montserrat } from "next/font/google";
import { BLOG_POSTS } from "@/lib/blog-posts";

const montserrat = Montserrat({ subsets: ["latin"], weight: ["600", "700", "800"] });

export const metadata: Metadata = {
  title: "Blog — Credit Rebuilding Tips for Canadians | Credit Path Canada",
  description:
    "Articles on rebuilding credit in Canada, consumer proposals, secured cards, score timelines, and more—from Credit Path Canada.",
};

export default function BlogIndexPage() {
  const h = montserrat.className;

  return (
    <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <p className={`text-xs font-bold uppercase tracking-[0.22em] text-[var(--cp-teal)] ${h}`}>Blog</p>
      <h1 className={`mt-3 text-3xl font-bold tracking-tight text-[var(--cp-dark)] sm:text-4xl ${h}`}>
        Credit education for Canadians
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--cp-dark)]/80">
        Practical guides on scores, secured products, insolvency options, and rebuilding after setbacks—all written for
        Canada&apos;s Equifax and TransUnion environment.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
        {BLOG_POSTS.map((post) => (
          <article
            key={post.slug}
            className="flex flex-col rounded-2xl border border-[var(--cp-border)] bg-white p-6 shadow-[0_8px_24px_rgba(15,25,35,0.06)]"
          >
            <h2 className={`text-lg font-bold leading-snug text-[var(--cp-dark)] sm:text-xl ${h}`}>{post.title}</h2>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--cp-dark)]/75">{post.excerpt}</p>
            <Link
              href={`/blog/${post.slug}`}
              className={`mt-6 inline-flex w-fit items-center rounded-xl bg-[var(--cp-teal)] px-4 py-2.5 text-sm font-bold text-[var(--cp-dark)] transition-opacity hover:opacity-90 ${h}`}
            >
              Read more →
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}
