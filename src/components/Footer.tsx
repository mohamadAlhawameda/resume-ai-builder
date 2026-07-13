'use client';

import Link from 'next/link';
import { Mail, Github, Linkedin, FileText } from 'lucide-react';
import { APP_NAME, APP_NAME_PRIMARY, APP_NAME_ACCENT } from '@/lib/config';

const PRODUCT_LINKS = [
  { href: '/resume', label: 'Resume Builder' },
  { href: '/analyze', label: 'Resume Scanner' },
  { href: '/jobs', label: 'Job Matching' },
  { href: '/tools', label: 'AI Tools' },
];

const COMPANY_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/faq', label: 'FAQ' },
  { href: '/register', label: 'Create Account' },
];

export default function Footer() {
  return (
    <footer className="bg-white text-slate-700">
      <div className="h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" aria-hidden />
      <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 text-sm">
        {/* Brand */}
        <div className="sm:col-span-2">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-slate-900 mb-4">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm shadow-blue-600/30">
              <FileText className="w-4 h-4" aria-hidden />
            </span>
            {APP_NAME_PRIMARY}
            {APP_NAME_ACCENT && <span className="text-blue-600">{APP_NAME_ACCENT}</span>}
          </Link>
          <p className="text-slate-500 leading-relaxed max-w-md">
            Build standout resumes, scan them against ATS criteria, and discover jobs that
            actually match your experience — powered by AI.
          </p>

          <div className="flex items-center gap-1 -ml-2 mt-6">
            {[
              { href: 'mailto:alhawameda4@gmail.com', label: 'Email', icon: Mail },
              { href: 'https://github.com/mohamadAlhawameda', label: 'GitHub', icon: Github },
              { href: 'https://www.linkedin.com/in/mohammad-alhawamdeh/', label: 'LinkedIn', icon: Linkedin },
            ].map(({ href, label, icon: Icon }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                target={href.startsWith('http') ? '_blank' : undefined}
                rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors duration-200"
              >
                <Icon className="w-5 h-5" />
              </a>
            ))}
          </div>
        </div>

        {/* Product */}
        <nav aria-label="Product">
          <h4 className="text-sm font-semibold text-slate-900 mb-4 tracking-wide uppercase">Product</h4>
          <ul className="space-y-2.5">
            {PRODUCT_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className="text-slate-500 hover:text-blue-600 transition-colors">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Company */}
        <nav aria-label="Company">
          <h4 className="text-sm font-semibold text-slate-900 mb-4 tracking-wide uppercase">Company</h4>
          <ul className="space-y-2.5">
            {COMPANY_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className="text-slate-500 hover:text-blue-600 transition-colors">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-slate-100 py-5 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
      </div>
    </footer>
  );
}
