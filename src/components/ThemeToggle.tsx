"use client";

import React, { useEffect } from "react";
import { Sun, Moon } from "lucide-react";

// Define the props interface
interface ThemeToggleProps {
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
}

export default function ThemeToggle({ theme, setTheme }: ThemeToggleProps) {
  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
  }, [theme]);

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="flex items-center px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded text-sm shadow hover:shadow-md transition"
      title="Toggle Theme"
    >
      {theme === "light" ? (
        <>
          <Moon className="w-4 h-4 mr-2 text-gray-800" /> Dark
        </>
      ) : (
        <>
          <Sun className="w-4 h-4 mr-2 text-yellow-300" /> Light
        </>
      )}
    </button>
  );
}
