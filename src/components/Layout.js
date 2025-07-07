// src/components/Layout.js
import { Link, Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-blue-600 text-white p-4 flex justify-between">
        <div className="font-bold">Post Share</div>
        <div className="space-x-4">
          <Link to="/">Home</Link>
          <Link to="/create">Create</Link>
        </div>
      </nav>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
      <footer className="bg-gray-200 text-center p-2 text-sm">
        &copy; 2025 Post Share v.${Date.now()}
      </footer>
    </div>
  );
}
