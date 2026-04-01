// pages/index.js
import Link from 'next/link';

export default function Home() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <header className="mb-10">
        <h1 className="text-4xl font-bold text-primary">Post Share</h1>
        <p className="text-secondary mt-2 text-lg">
          Simple private posting — share an ID & password to view.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-secondary uppercase tracking-wider text-sm">
          How to use
        </h2>

        <ol className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              step: '01', title: 'Create a post',
              desc: 'Set a Post ID, visibility, and optional password.',
              href: '/posts/new', label: 'Create post',
            },
            {
              step: '02', title: 'Share credentials',
              desc: 'Share the Post ID and password with the reader.',
              href: null, label: null,
            },
            {
              step: '03', title: 'View a post',
              desc: 'Enter the shared ID & password to read.',
              href: '/posts/view', label: 'Open viewer',
            },
            {
              step: '04', title: 'Manage posts',
              desc: 'Edit, delete, or favorite posts you own.',
              href: '/posts/view-all', label: 'My posts',
            },
          ].map(({ step, title, desc, href, label }) => (
            <li key={step} className="card p-5 space-y-2">
              <span className="text-xs font-bold text-brand">{step}</span>
              <h3 className="text-base font-semibold text-primary">{title}</h3>
              <p className="text-sm text-secondary">{desc}</p>
              {href && (
                <Link href={href} className="btn-primary btn-sm mt-1 inline-flex">
                  {label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-3">Quick links</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/posts/new"      className="btn-primary">New Post</Link>
          <Link href="/posts/view"     className="btn-ghost">View Posts</Link>
          <Link href="/posts/view-all" className="btn-ghost">All / Favorites</Link>
        </div>
      </section>
    </main>
  );
}
