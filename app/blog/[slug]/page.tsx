import type { Metadata } from "next";
import Link from "next/link";
import { Montserrat } from "next/font/google";
import { notFound } from "next/navigation";
import { getAllBlogSlugs, getBlogPost } from "@/lib/blog-posts";

const montserrat = Montserrat({ subsets: ["latin"], weight: ["600", "700", "800"] });

export function generateStaticParams() {
  return getAllBlogSlugs().map((slug) => ({ slug }));
}

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) {
    return { title: "Article not found | Credit Path Canada" };
  }
  return {
    title: post.metaTitle,
    description: post.metaDescription,
  };
}

const ARTICLE_STYLES = `
.blog-article-body h2 {
  font-size: 1.125rem;
  font-weight: 700;
  margin-top: 1.75rem;
  margin-bottom: 0.5rem;
  color: var(--cp-dark);
  font-family: var(--font-landing-montserrat), var(--font-syne), Arial, Helvetica, sans-serif;
}
.blog-article-body p {
  margin-bottom: 1rem;
  line-height: 1.75;
  color: rgba(15, 25, 35, 0.88);
  font-size: 0.9375rem;
}
@media (min-width: 640px) {
  .blog-article-body p { font-size: 1rem; }
}
.blog-article-body a {
  color: var(--cp-teal);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.blog-article-body .blog-cta {
  margin-top: 2rem;
  margin-bottom: 0;
  padding: 1rem 1.25rem;
  border-radius: 0.75rem;
  background: rgba(0, 201, 167, 0.12);
  border: 1px solid var(--cp-border);
  font-weight: 500;
}
`;

export default async function BlogArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const h = montserrat.className;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: ARTICLE_STYLES }} />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <Link
          href="/blog"
          className={`text-sm font-semibold text-[var(--cp-teal)] underline-offset-4 hover:underline ${h}`}
        >
          ← Back to Blog
        </Link>
        <article className="mt-6 rounded-2xl border border-[var(--cp-border)] bg-white px-5 py-8 shadow-[0_8px_24px_rgba(15,25,35,0.06)] sm:px-8 sm:py-10">
          <p className={`text-xs font-bold uppercase tracking-[0.22em] text-[var(--cp-teal)] ${h}`}>Credit Path Canada</p>
          <h1 className={`mt-3 text-2xl font-bold leading-tight tracking-tight text-[var(--cp-dark)] sm:text-3xl ${h}`}>
            {post.title}
          </h1>
          <div
            className="blog-article-body mt-8"
            dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
          />
        </article>
      </main>
    </>
  );
}
