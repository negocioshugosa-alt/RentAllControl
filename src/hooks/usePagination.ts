"use client";
// src/hooks/usePagination.ts
import { useState, useCallback } from "react";

interface UsePaginationOptions {
  initialPage?: number;
  pageSize?: number;
}

export function usePagination({ initialPage = 1, pageSize = 20 }: UsePaginationOptions = {}) {
  const [page, setPage] = useState(initialPage);
  const [perPage] = useState(pageSize);

  const nextPage = useCallback(() => setPage((p) => p + 1), []);
  const prevPage = useCallback(() => setPage((p) => Math.max(1, p - 1)), []);
  const goToPage = useCallback((p: number) => setPage(p), []);
  const reset = useCallback(() => setPage(1), []);

  const getRange = (total: number) => {
    const from = (page - 1) * perPage;
    const to = Math.min(from + perPage - 1, total - 1);
    return { from, to };
  };

  return { page, perPage, nextPage, prevPage, goToPage, reset, getRange };
}
