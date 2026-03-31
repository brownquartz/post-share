// src/App.js
import React from 'react';
import Layout from './components/Layout';
import Home from './pages';           // adjust if your home page is elsewhere
import Signup from './pages/auth/signup';
import Login  from './pages/auth/login';
import Create from './pages/posts/new';        // you'll need to create this
import View   from './pages/posts/view';          // and this

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth/signup" element={<Signup />} />
        <Route path="/auth/login"  element={<Login />} />
        <Route path="/createPost"  element={<Create />} />
        <Route path="/viewPost"    element={<View />} />
        {/* catch-all redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
