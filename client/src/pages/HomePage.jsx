import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/ui/Header';

// TODO: add login button
// TODO: make webmaster betyter visable + an email link
// TODO: add custom greeting if signed in

export default function HomePage() {
  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-screen w-full bg-cover bg-center text-white"
      style={{ backgroundImage: "url('/cyclone.jpg')" }}
    >
      <div className="absolute inset-0 bg-black opacity-50" aria-hidden="true"></div>

      <div className="z-10 text-center w-full max-w-2xl mx-auto px-4">
        <div className="w-full bg-white/20 backdrop-blur-sm p-8 border border-white/30 rounded-xl shadow-md">
          <Header level={1} className="text-white">Welcome to Cyclone!</Header>
          <p className="text-lg mt-2">TODO: About</p>
          <div className="mt-6 space-x-4">
              <Link to="/routes" className="px-4 py-2 text-2xl font-bold text-white !text-white bg-blue-500/20 border border-2 border-white hover:bg-blue-500 hover:underline rounded transition-colors">Generate Routes</Link>
              <Link to="/login" className="px-4 py-2 text-2xl font-bold text-white !text-white bg-blue-500/20 border border-2 border-white hover:bg-blue-500 hover:underline rounded transition-colors">Log In</Link>
          </div>

        </div>
      </div>
        <p className="text-lg text-white mt-2">Problems? Please contact webmaster@cyclone.com</p>
    </div>
  );
}

