'use client';

import Link from 'next/link';
import { Mail, Linkedin, FileText, Globe2 } from 'lucide-react';
import { APP_NAME, APP_NAME_PRIMARY, APP_NAME_ACCENT } from '@/lib/config';
import { useLocale } from '@/i18n/LocaleProvider';

const PRODUCT_LINKS = [
  { href: '/resume', labelKey: 'footer.resumeBuilder' },
  { href: '/analyze', labelKey: 'footer.resumeScanner' },
  { href: '/jobs', labelKey: 'footer.jobMatching' },
  { href: '/radar', labelKey: 'footer.opportunityRadar' },
  { href: '/profile', labelKey: 'footer.careerProfile' },
  { href: '/tools', labelKey: 'footer.aiTools' },
];

const COMPANY_LINKS = [
  { href: '/', labelKey: 'footer.home' },
  { href: '/faq', labelKey: 'footer.faq' },
  { href: '/register', labelKey: 'footer.createAccount' },
];

export default function Footer() {
  const { t } = useLocale();
  return (
    <footer className="bg-surface text-muted-foreground border-t border-border">
      <div className="h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" aria-hidden />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-14 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 text-sm">
        {/* Brand */}
        <div className="sm:col-span-2">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-foreground mb-4">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent text-primary-foreground flex items-center justify-center shadow-sm shadow-primary/30">
              <FileText className="w-4 h-4" aria-hidden />
            </span>
            {APP_NAME_PRIMARY}
            {APP_NAME_ACCENT && <span className="text-primary">{APP_NAME_ACCENT}</span>}
          </Link>
          <p className="text-muted-foreground leading-relaxed max-w-md">{t('footer.tagline')}</p>

          <div className="flex items-center gap-1 -ms-2 mt-6">
            {[
              { href: 'mailto:alhawameda4@gmail.com', label: 'Email', icon: Mail },
              { href: 'https://www.linkedin.com/in/mohammad-alhawamdeh/', label: 'LinkedIn', icon: Linkedin },
              { href: 'https://websolarch.com', label: 'WebSolArch', icon: Globe2 },
            ].map(({ href, label, icon: Icon }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                target={href.startsWith('http') ? '_blank' : undefined}
                rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="w-11 h-11 flex items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors duration-200"
              >
                <Icon className="w-5 h-5" />
              </a>
            ))}
          </div>
        </div>

        {/* Product */}
        <nav aria-label="Product">
          <h4 className="text-sm font-semibold text-foreground mb-4 tracking-wide uppercase">{t('footer.product')}</h4>
          <ul className="space-y-2.5">
            {PRODUCT_LINKS.map(({ href, labelKey }) => (
              <li key={href}>
                <Link href={href} className="text-muted-foreground hover:text-primary transition-colors">
                  {t(labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Explore */}
        <nav aria-label={t('footer.company')}>
          <h4 className="text-sm font-semibold text-foreground mb-4 tracking-wide uppercase">{t('footer.company')}</h4>
          <ul className="space-y-2.5">
            {COMPANY_LINKS.map(({ href, labelKey }) => (
              <li key={href}>
                <Link href={href} className="text-muted-foreground hover:text-primary transition-colors">
                  {t(labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-border py-5 px-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {APP_NAME}. {t('footer.rights')}
      </div>
    </footer>
  );
}
