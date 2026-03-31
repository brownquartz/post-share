// pages/index.js
import Link from 'next/link';

export default function Home() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Post Share</h1>
        <p className="text-slate-600 mt-2">
          Simple private posting. Share an ID & password to view a post.
        </p>
      </header>

      {/* How to use */}
      <section aria-labelledby="howto" className="space-y-4">
        <h2 id="howto" className="text-xl font-semibold">How to use</h2>

        <ol className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <li className="rounded-2xl border p-5">
            <p className="text-sm font-semibold text-blue-600">Step 1</p>
            <h3 className="text-lg font-semibold mt-1">Create a post</h3>
            <p className="text-slate-600 mt-1">
              Go to the create page and input title, content, view ID and view password.
            </p>
            <Link href="/posts/new" className="inline-flex mt-3 px-4 py-2 rounded-lg bg-blue-600 text-white">
              Create post
            </Link>
          </li>

          <li className="rounded-2xl border p-5">
            <p className="text-sm font-semibold text-blue-600">Step 2</p>
            <h3 className="text-lg font-semibold mt-1">Share credentials</h3>
            <p className="text-slate-600 mt-1">
              Share the <b>view ID</b> and <b>view password</b> with the person who should read it.
            </p>
          </li>

          <li className="rounded-2xl border p-5">
            <p className="text-sm font-semibold text-blue-600">Step 3</p>
            <h3 className="text-lg font-semibold mt-1">View a post</h3>
            <p className="text-slate-600 mt-1">
              On the View page, enter the shared ID & password to fetch the post.
            </p>
            <Link href="/posts/view" className="inline-flex mt-3 px-4 py-2 rounded-lg border">
              Open Viewer
            </Link>
          </li>

          <li className="rounded-2xl border p-5">
            <p className="text-sm font-semibold text-blue-600">Step 4</p>
            <h3 className="text-lg font-semibold mt-1">Update or delete</h3>
            <p className="text-slate-600 mt-1">
              Post owners can update or delete using the edit password (if your API supports it).
            </p>
          </li>
        </ol>
      </section>

      {/* Shortcuts */}
      <section aria-labelledby="shortcuts" className="mt-10">
        <h2 id="shortcuts" className="text-xl font-semibold mb-3">Shortcuts</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/posts/new" className="px-4 py-2 rounded-lg bg-blue-600 text-white">New Post</Link>
          <Link href="/posts/view" className="px-4 py-2 rounded-lg border">Open Viewer</Link>
          <Link href="/posts/view-all" className="px-4 py-2 rounded-lg border">View All Posts</Link>
        </div>
      </section>
    </main>
  );
}
