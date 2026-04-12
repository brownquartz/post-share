// pages/purpose.js
export default function PurposePage() {
  return (
    <main className="max-w-lg mx-auto px-5 py-16">
      <h1 className="text-3xl font-bold text-primary mb-6">このサービスについて</h1>

      <div className="space-y-6 text-secondary text-sm leading-relaxed">
        <p>
          Post Share は、<strong className="text-primary">完全なプライベートでも、完全な公開でもない</strong>情報を、手軽に共有したいときのために作りました。
        </p>

        <div className="card p-4 space-y-2">
          <p className="font-semibold text-primary text-base">こんな使い方を想定しています</p>
          <ul className="space-y-2 list-none">
            <li>🗺️ 旅行のプランを友達と共有したい</li>
            <li>📋 グループ内だけで見れるメモを残したい</li>
            <li>📝 誰かに渡す前の下書きを一時的に共有したい</li>
          </ul>
        </div>

        <p>
          SNSに投稿するほどでもないけど、メッセージアプリで長文を送るのも面倒——そんなときにPost IDを共有するだけで、相手がすぐ見られるようにしました。
        </p>

        <div className="card p-4 space-y-2">
          <p className="font-semibold text-primary text-base">会員登録について</p>
          <p>
            会員登録なしでも投稿・閲覧ができます。<br />
            共有する相手全員がアカウントを作る必要はありません。<br />
            Post IDだけを伝えれば、誰でもすぐ読めます。
          </p>
          <p className="text-muted text-xs">
            ※ アカウントを作ると、マイポストやお気に入り機能が使えます。
          </p>
        </div>

        <p>
          気軽に使ってみてください。フィードバックや改善要望は「意見箱」からどうぞ。
        </p>
      </div>
    </main>
  );
}
