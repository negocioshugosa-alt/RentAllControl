import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
}

export function Logo({ className, iconOnly = false }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative flex-shrink-0 flex items-center justify-center w-8 h-8 md:w-9 md:h-9">
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-md"
        >
          <defs>
            <linearGradient id="grad-top" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" /> {/* Cyan 500 */}
              <stop offset="100%" stopColor="#3b82f6" /> {/* Blue 500 */}
            </linearGradient>
            <linearGradient id="grad-left" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" /> {/* Indigo 500 */}
              <stop offset="100%" stopColor="#8b5cf6" /> {/* Violet 500 */}
            </linearGradient>
            <linearGradient id="grad-right" x1="100%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#0ea5e9" /> {/* Sky 500 */}
              <stop offset="100%" stopColor="#2dd4bf" /> {/* Teal 400 */}
            </linearGradient>
          </defs>

          {/* Isometric Box Design mimicking option 2 */}
          {/* Top Face */}
          <path
            d="M50 15 L85 35 L50 55 L15 35 Z"
            fill="url(#grad-top)"
            opacity="0.9"
          />
          
          {/* Left Face */}
          <path
            d="M15 35 L50 55 L50 90 L15 70 Z"
            fill="url(#grad-left)"
            opacity="0.9"
          />
          
          {/* Right Face */}
          <path
            d="M50 55 L85 35 L85 70 L50 90 Z"
            fill="url(#grad-right)"
            opacity="0.9"
          />

          {/* Subtle Inner Highlight lines for 3D effect */}
          <path
            d="M15 35 L50 55 L85 35"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.3"
            fill="none"
          />
          <path
            d="M50 55 L50 90"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.3"
            fill="none"
          />
        </svg>
      </div>

      {!iconOnly && (
        <span className="font-display font-bold text-lg md:text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 dark:from-white dark:to-gray-400">
          RentAll<span className="text-cyan-400">Control</span>
        </span>
      )}
    </div>
  );
}
