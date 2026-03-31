// src/pages/_app.js
import React from 'react';
import { AuthProvider } from '../context/AuthContext';
import '../styles/global.css';          // Tailwind やグローバル CSS
import Layout from '../components/Layout';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ;

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider apiBase={API_BASE}>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </AuthProvider>
  );
}
