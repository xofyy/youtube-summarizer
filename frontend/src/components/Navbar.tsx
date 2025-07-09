'use client';
import Link from "next/link";
import { useUser, UserButton, SignOutButton } from '@clerk/nextjs';
import { useState } from "react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/pricing", label: "Pricing" },
  { href: "/admin", label: "Admin" },
];

export default function Navbar() {
  const { isSignedIn, user } = useUser();
  const [darkMode, setDarkMode] = useState(false);

  const handleToggleDark = () => {
    setDarkMode((d) => {
      if (!d) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return !d;
    });
  };

  return (
    <nav className="w-full flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-bold text-xl tracking-tight text-blue-600 dark:text-blue-400">YT Summarizer</Link>
        <div className="hidden sm:flex gap-4">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleToggleDark}
          className="rounded p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Toggle dark mode"
        >
          {darkMode ? (
            <span>🌙</span>
          ) : (
            <span>☀️</span>
          )}
        </button>
        {isSignedIn ? (
          <div className="flex items-center gap-2">
            <Link href="/user-profile" className="ml-2 px-4 py-2 rounded bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors">Profile</Link>
            <UserButton afterSignOutUrl="/" />
          </div>
        ) : (
          <Link
            href="/auth"
            className="ml-2 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Login
          </Link>
        )}
      </div>
    </nav>
  );
} 