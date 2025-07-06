// src/App.js
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import CreatePost from './pages/CreatePost';
import PostsList from './pages/PostsList';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="create" element={<CreatePost />} />
        {/* View without postId: inputs ID & PW to list all posts */}
        <Route path="view" element={<PostsList />} />
      </Route>
    </Routes>
  );
}
