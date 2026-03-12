import { useCallback } from 'react';
import { toPng } from 'html-to-image';

/**
 * Hook for exporting the family tree canvas as a PNG image.
 * Targets the React Flow viewport element.
 */
export function useExport() {
  const exportAsPng = useCallback(async () => {
    // React Flow renders inside a div with class .react-flow__viewport
    const viewport = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!viewport) {
      console.warn('Cannot find React Flow viewport for export');
      return;
    }

    try {
      const dataUrl = await toPng(viewport, {
        backgroundColor: '#0f0f17',
        quality: 1,
        pixelRatio: 2,
      });

      // Create download link
      const link = document.createElement('a');
      link.download = `family-tree-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    }
  }, []);

  return { exportAsPng };
}
