'use client';

import Link from 'next/link';
import { Mail, Github, Linkedin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 text-gray-700">
      <div className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-5 gap-12 text-sm">
        {/* Brand */}
        <div className="md:col-span-2 flex flex-col justify-between">
          <h2 className="text-3xl font-extrabold text-blue-600 mb-4 tracking-tight select-none">
            AI Resume Builder
          </h2>
          <p className="text-gray-600 leading-relaxed max-w-md">
            Create standout resumes effortlessly with our AI-enhanced tools. Designed for students, professionals, and job seekers aiming to shine.
          </p>

          {/* Social Icons */}
          <div className="flex space-x-6 mt-6">
            {[
              { href: "mailto:alhawameda4@gmail.com", label: "Email", icon: Mail },
              { href: "https://github.com/mohamadAlhawameda", label: "GitHub", icon: Github },
              { href: "https://www.linkedin.com/in/mohammad-alhawamdeh/", label: "LinkedIn", icon: Linkedin },
            ].map(({ href, label, icon: Icon }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="text-gray-500 hover:text-blue-600 transition-colors duration-300 ease-in-out"
              >
                <Icon className="w-6 h-6" />
              </a>
            ))}
          </div>
        </div>

        {/* Company Links */}
        <div className="flex flex-col justify-start">
          <h4 className="text-base font-semibold text-gray-900 mb-5 tracking-wide uppercase">
            Company
          </h4>
          <ul className="space-y-3">
            <li>
              <Link
                href="/"
                className="text-gray-600 hover:text-blue-600 transition-colors duration-200 ease-in-out font-medium"
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                href="/about"
                className="text-gray-600 hover:text-blue-600 transition-colors duration-200 ease-in-out font-medium"
              >
                About
              </Link>
            </li>
            {/* <li><Link href="/contact" className="hover:text-blue-600">Contact</Link></li> */}
            <li>
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-blue-600 transition-colors duration-200 ease-in-out font-medium"
              >
                Dashboard
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-200 py-5 text-center text-xs text-gray-500 select-none font-light tracking-wide">
        © {new Date().getFullYear()} AI Resume Builder. All rights reserved.
      </div>
    </footer>
  );
}
