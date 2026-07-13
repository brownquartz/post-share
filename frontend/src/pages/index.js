// pages/index.js
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user, authReady } = useAuth();

  return (
    <>
    <Head>
      <title>Post Share — IDで投稿を手軽に共有するサービス</title>
      <meta name="description" content="Post ShareはテキストをIDで共有できる無料のWebサービスです。アカウント不要で投稿でき、パスワード保護・友だち限定公開など柔軟な公開設定に対応しています。" />
      <link rel="canonical" href="https://post-share.brwqz.net/" />
    </Head>
    <main>
      {/* ===== Hero ===== */}
      <section className="max-w-2xl mx-auto px-5 pt-16 pb-12 text-center">
        <h1 className="text-4xl font-bold text-primary mb-4">Post Share</h1>
        <p className="text-secondary text-lg mb-3">
          IDで投稿を手軽に共有できる無料のWebサービス
        </p>
        <p className="text-muted text-sm mb-10">
          アカウント不要で投稿可能。テキスト・リッチテキスト・画像に対応。<br />
          パスワード保護・友だち限定・作成者のみなど、柔軟な公開設定が選べます。
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
          <Link href="/posts/view" className="btn-primary px-8 py-3 text-base">
            投稿を見る
          </Link>
          <Link href="/posts/new" className="btn-ghost px-8 py-3 text-base">
            投稿を作る
          </Link>
        </div>
        {authReady && user && (
          <Link href="/posts/view-all" className="text-sm text-brand hover:underline">
            ★ マイポスト・お気に入りを見る
          </Link>
        )}
        {authReady && !user && (
          <p className="text-xs text-muted mt-2">
            <Link href="/auth/signup" className="text-brand hover:underline">アカウント登録</Link>で友だち機能・お気に入りが使えます（無料）
          </p>
        )}
      </section>

      {/* ===== How it works ===== */}
      <section className="max-w-2xl mx-auto px-5 pb-12">
        <h2 className="text-xl font-bold text-primary mb-6 text-center">使い方</h2>
        <ol className="grid sm:grid-cols-3 gap-4">
          {[
            { step: '01', title: '投稿を作る', desc: 'タイトル・本文・Post IDを入力して投稿。アカウントなしでもOK。' },
            { step: '02', title: 'IDを共有する', desc: 'Post IDをLINEやメールなどで相手に伝えるだけ。' },
            { step: '03', title: '相手が閲覧', desc: '「投稿を見る」ページにIDを入力すれば即閲覧できます。' },
          ].map(({ step, title, desc }) => (
            <li key={step} className="card p-5 list-none">
              <span className="text-brand font-bold text-2xl">{step}</span>
              <h3 className="font-semibold text-primary mt-2 mb-1">{title}</h3>
              <p className="text-secondary text-sm">{desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ===== Features ===== */}
      <section className="max-w-2xl mx-auto px-5 pb-12">
        <h2 className="text-xl font-bold text-primary mb-6 text-center">主な機能</h2>
        <ul className="grid sm:grid-cols-2 gap-4">
          {[
            { icon: '🔓', title: 'アカウント不要で投稿',       desc: 'ログインなしで誰でも投稿・閲覧が可能です。' },
            { icon: '🔒', title: 'パスワード保護',             desc: '特定のパスワードを持つ人だけに公開できます。' },
            { icon: '👥', title: '友だち限定公開',             desc: '承認した友だちにのみ投稿を公開できます。' },
            { icon: '📝', title: 'リッチテキスト対応',         desc: '見出し・太字・箇条書き・画像の挿入ができます。' },
            { icon: '⭐', title: 'お気に入り',                 desc: '気に入った投稿をお気に入り登録して後から確認できます。' },
            { icon: '💬', title: 'コメント',                   desc: '投稿にコメントを残せます。表示名は匿名も選択可能。' },
            { icon: '📅', title: '有効期限設定',               desc: '一定期間後に自動で非公開になる設定が可能です。' },
            { icon: '📤', title: 'TXT・Word出力',              desc: '投稿内容をテキストまたはWordファイルでダウンロード可能。' },
          ].map(({ icon, title, desc }) => (
            <li key={title} className="card p-4 list-none flex gap-3">
              <span className="text-2xl shrink-0">{icon}</span>
              <div>
                <h3 className="font-semibold text-primary text-sm mb-0.5">{title}</h3>
                <p className="text-muted text-xs">{desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ===== Use cases ===== */}
      <section className="max-w-2xl mx-auto px-5 pb-12">
        <h2 className="text-xl font-bold text-primary mb-4 text-center">こんな使い方ができます</h2>
        <div className="card p-6">
          <ul className="space-y-3 text-sm text-secondary">
            <li>📌 <span className="font-medium text-primary">メモ・議事録の共有</span> — 会議のメモをIDで手軽に共有</li>
            <li>📌 <span className="font-medium text-primary">限定公開のお知らせ</span> — パスワードを知っている人だけに情報を届ける</li>
            <li>📌 <span className="font-medium text-primary">友だちへのメッセージ</span> — 友だち限定で近況や連絡を共有</li>
            <li>📌 <span className="font-medium text-primary">一時的な情報共有</span> — 有効期限を設定して期間限定で公開</li>
            <li>📌 <span className="font-medium text-primary">作業ログ・日記</span> — 作成者のみ閲覧で個人のメモとして活用</li>
          </ul>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="max-w-2xl mx-auto px-5 pb-16 text-center">
        <div className="card p-8">
          <h2 className="text-lg font-bold text-primary mb-2">さっそく使ってみる</h2>
          <p className="text-secondary text-sm mb-6">登録不要・完全無料でご利用いただけます</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/posts/new" className="btn-primary px-8 py-3">
              投稿を作る
            </Link>
            <Link href="/posts/view" className="btn-ghost px-8 py-3">
              投稿を検索する
            </Link>
          </div>
        </div>
      </section>
    </main>
    </>
  );
}
