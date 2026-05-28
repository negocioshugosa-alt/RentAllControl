"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface Props {
  initialStart: string;
  initialEnd: string;
}

export function DashboardDateFilter({ initialStart, initialEnd }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);

  function applyDates(newStart: string, newEnd: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("start", newStart);
    params.set("end", newEnd);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 p-5 rounded-xl border bg-card items-end mb-6 animate-fade-in">
      <div>
        <label className="text-sm font-medium mb-1 block text-muted-foreground">Período Inicial</label>
        <input 
          type="date" 
          value={start} 
          onChange={(e) => {
            setStart(e.target.value);
            applyDates(e.target.value, end);
          }} 
          className="input" 
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block text-muted-foreground">Período Final</label>
        <input 
          type="date" 
          value={end} 
          onChange={(e) => {
            setEnd(e.target.value);
            applyDates(start, e.target.value);
          }} 
          className="input" 
        />
      </div>
    </div>
  );
}
