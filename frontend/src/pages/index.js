// pages/index.js
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user, authReady } = useAuth();

  return (
    <>
    <Head><title>Post Share</title></Head>
    <main className="max-w-lg mx-auto px-5 py-16 text-center">
      {/* Hero */}
      <h1 className="text-4xl font-bold text-primary mb-3">Post Share</h1>
      <p className="text-secondary text-base mb-10">
        IDで投稿を手軽に共有するサービス
      </p>

      {/* Main actions */}
      <div className="space-y-3 mb-10">
        <Link href="/posts/view" className="btn-primary w-full py-4 text-base">
          投稿を見る
        </Link>
        <Link href="/posts/new" className="btn-ghost w-full py-4 text-base">
          投稿を作る
        </Link>
        {authReady && user && (
          <Link href="/posts/view-all" className="btn-ghost w-full py-3 text-sm">
            ★ マイポスト
          </Link>
        )}
      </div>

      {/* How-to — open by default */}
      <details className="card text-left p-4" open>
        <summary className="text-sm font-semibold text-secondary cursor-pointer select-none">
          使い方
        </summary>
        <ol className="mt-3 space-y-2 text-sm text-secondary list-none">
          <li><span className="text-brand font-bold mr-2">01</span>「投稿を作る」からタイトル・内容・Post IDを入力して投稿する</li>
          <li><span className="text-brand font-bold mr-2">02</span>Post IDを相手に共有する</li>
          <li><span className="text-brand font-bold mr-2">03</span>相手は「投稿を見る」からIDを入力して閲覧</li>
          {user && <li><span className="text-brand font-bold mr-2">04</span>マイポストで投稿の管理・お気に入りを確認</li>}
        </ol>
      </details>
    </main>
    </>
  );
}
