import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
}

export function Logo({ className, iconOnly = false }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative flex-shrink-0 flex items-center justify-center w-8 h-8 md:w-9 md:h-9 overflow-hidden rounded-lg">
        <Image 
          src="/logo.png" 
          alt="RentAllControl Logo" 
          width={36} 
          height={36} 
          className="w-full h-full object-cover rounded-lg"
          priority
        />
      </div>

      {!iconOnly && (
        <span className="font-display font-bold text-lg md:text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 dark:from-white dark:to-gray-400">
          RentAll<span className="text-cyan-400">Control</span>
        </span>
      )}
    </div>
  );
}
