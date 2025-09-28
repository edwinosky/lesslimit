'use client';

import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function Navbar() {
  return (
    <header className="flex justify-between items-center p-4 bg-gray-800 shadow-lg">
      <h1 className="text-2xl font-bold">
        <Link href="/" className="hover:text-blue-400 transition-colors">
          LessLimit
        </Link>
      </h1>
      <nav className="flex items-center space-x-6">
        <Link href="/" className="hover:text-blue-400 transition-colors">Markets</Link>
        <Link href="/trade" className="hover:text-blue-400 transition-colors">Trade</Link>
        <Link href="/portfolio" className="hover:text-blue-400 transition-colors">Portfolio</Link>

        {/* RainbowKit Connect Button */}
        <ConnectButton />
      </nav>
    </header>
  );
}
