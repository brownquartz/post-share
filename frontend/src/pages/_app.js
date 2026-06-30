// src/pages/_app.js
import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { AuthProvider } from '../context/AuthContext';
import '../styles/global.css';
import 'react-quill-new/dist/quill.snow.css';
import Layout from '../components/Layout';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

export default function App({ Component, pageProps }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const dark = saved !== 'light';
    setIsDark(dark);
    document.documentElement.classList.toggle('dark', dark);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <AuthProvider apiBase={API_BASE}>
      <Head>
        <title>Post Share</title>
        <meta name="description" content="IDで投稿を手軽に共有するサービス" />
      </Head>
      <Layout toggleTheme={toggleTheme} isDark={isDark}>
        <Component {...pageProps} />
      </Layout>
    </AuthProvider>
  );
}
