import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="ja" className="dark">
      <Head>
        <meta name="google-site-verification" content="5hVaEwa5iqGLgl8f-AW3-cEoFsg7zxBqHyka6rQow6c" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
