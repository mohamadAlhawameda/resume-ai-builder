'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Explicitly type href as string
  const isActive = (href: string) => pathname === href;

  return (
    <header className="sticky top-0 z-50 bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        {/* Logo */}
        <Link
          href="/"
          className="text-2xl font-bold tracking-tight text-blue-600 hover:opacity-90 transition"
        >
          AI Resume Builder
        </Link>

        {/* Desktop Links */}
        <nav className="hidden md:flex items-center space-x-4">
          <Link
            href="/login"
            className={`text-sm font-medium px-4 py-2 rounded transition ${
              isActive('/login')
                ? 'text-blue-600 font-semibold'
                : 'text-gray-700 hover:text-blue-600'
            }`}
          >
            Login
          </Link>
          <Link
            href="/register"
            className="text-sm px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
          >
            Get Started
          </Link>
        </nav>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden text-gray-800 focus:outline-none"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden px-6 pb-4 space-y-3 bg-white shadow-sm border-t"
          >
            <Link
              href="/login"
              onClick={() => setIsOpen(false)}
              className={`block text-sm font-medium transition ${
                isActive('/login')
                  ? 'text-blue-600 font-semibold'
                  : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              Login
            </Link>
            <Link
              href="/register"
              onClick={() => setIsOpen(false)}
              className="block w-full text-center text-sm px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              Get Started
            </Link>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
