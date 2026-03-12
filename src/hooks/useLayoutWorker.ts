import { useEffect, useRef, useCallback } from 'react';
import type { LayoutPerson, LayoutResult } from '../workers/layoutWorker';

/**
 * Hook to manage communication with the layout Web Worker.
 * Sends person data to the worker and receives computed layout positions.
 */
export function useLayoutWorker(
  onLayoutComplete: (result: LayoutResult) => void
) {
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Create worker using Vite's ?worker import syntax
    workerRef.current = new Worker(
      new URL('../workers/layoutWorker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (event: MessageEvent<LayoutResult>) => {
      onLayoutComplete(event.data);
    };

    workerRef.current.onerror = (err) => {
      console.error('Layout worker error:', err);
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, [onLayoutComplete]);

  const requestLayout = useCallback((persons: LayoutPerson[]) => {
    workerRef.current?.postMessage(persons);
  }, []);

  return { requestLayout };
}