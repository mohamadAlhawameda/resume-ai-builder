'use client';

import React, { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';

// Click-outside + Escape-to-close, extracted once. Previously hand-rolled
// with its own useState+useRef+listener in three places in Navbar.tsx
// (tools/notifications/user menus) and again in LanguageSwitcher.tsx.
export function useDisclosure(defaultOpen = false) {
  const [open, setOpen] = useState(defaultOpen);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return { open, setOpen, ref };
}

interface MenuContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
  buttonId: string;
}
const MenuContext = createContext<MenuContextValue | null>(null);

function useMenuContext() {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error('Menu.* components must be rendered inside <Menu>');
  return ctx;
}

/** Self-contained dropdown menu — <Menu><MenuButton/><MenuItems>...</MenuItems></Menu>.
 * Owns its own open state, outside-click, and Escape handling. */
export function Menu({ children, className }: { children: React.ReactNode; className?: string }) {
  const { open, setOpen, ref } = useDisclosure();
  const buttonId = useId();
  return (
    <MenuContext.Provider value={{ open, setOpen, buttonId }}>
      <div ref={ref} className={clsx('relative', className)}>
        {children}
      </div>
    </MenuContext.Provider>
  );
}

export function MenuButton({ children, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen, buttonId } = useMenuContext();
  return (
    <button
      id={buttonId}
      type="button"
      onClick={() => setOpen(!open)}
      aria-haspopup="menu"
      aria-expanded={open}
      className={className}
      {...rest}
    >
      {children}
    </button>
  );
}

export function MenuItems({
  children,
  align = 'start',
  width = 'w-56',
  className,
}: {
  children: React.ReactNode;
  align?: 'start' | 'end';
  width?: string;
  className?: string;
}) {
  const { open, buttonId } = useMenuContext();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          role="menu"
          aria-labelledby={buttonId}
          className={clsx(
            'absolute mt-2 max-w-[calc(100vw-2rem)] bg-surface border border-border rounded-2xl shadow-soft-lg py-2 z-40',
            width,
            align === 'end' ? 'end-0' : 'start-0',
            className
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface MenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  danger?: boolean;
  icon?: React.ReactNode;
}

/** An action item (button) inside a Menu — closes the menu on click. */
export function MenuItem({ children, danger, icon, className, onClick, ...rest }: MenuItemProps) {
  const { setOpen } = useMenuContext();
  return (
    <button
      type="button"
      role="menuitem"
      onClick={(e) => {
        onClick?.(e);
        setOpen(false);
      }}
      className={clsx(
        'w-full flex items-center gap-2.5 px-4 py-2 text-sm text-start transition',
        danger ? 'text-danger hover:bg-danger/10' : 'text-foreground hover:bg-surface-hover',
        className
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

interface MenuLinkProps extends React.ComponentPropsWithoutRef<typeof Link> {
  active?: boolean;
  icon?: React.ReactNode;
}

/** A navigation item (Next.js Link) inside a Menu — closes the menu on click. */
export function MenuLink({ children, active, icon, className, onClick, ...rest }: MenuLinkProps) {
  const { setOpen } = useMenuContext();
  return (
    <Link
      role="menuitem"
      aria-current={active ? 'page' : undefined}
      onClick={(e) => {
        onClick?.(e);
        setOpen(false);
      }}
      className={clsx(
        'flex items-center gap-2.5 px-4 py-2 text-sm transition',
        active ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-surface-hover',
        className
      )}
      {...rest}
    >
      {icon}
      {children}
    </Link>
  );
}
