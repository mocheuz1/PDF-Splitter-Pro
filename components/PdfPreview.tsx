import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { SplitOrientation } from '../types';
import { LoaderIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons';

// Handle potential module interop issues (ESM vs CJS) where exports might be under .default
// @ts-ignore
const pdfjs = pdfjsLib.default ?? pdfjsLib;

// Initialize PDF.js worker
if (pdfjs?.GlobalWorkerOptions) {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;
}

interface PdfPreviewProps {
  file: File | null;
  orientation: SplitOrientation;
  percentage: number;
  onPercentageChange: (newPercentage: number) => void;
}

export const PdfPreview: React.FC<PdfPreviewProps> = ({ 
  file, 
  orientation, 
  percentage, 
  onPercentageChange 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [pageInput, setPageInput] = useState<string>('1');

  // Effect to load the PDF Document object when file changes
  useEffect(() => {
    if (!file) {
      setPdfDoc(null);
      setTotalPages(0);
      setCurrentPage(1);
      setPageInput('1');
      // Clear canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
        canvas.height = 0;
      }
      return;
    }

    const loadPdf = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument(arrayBuffer);
        const doc = await loadingTask.promise;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setCurrentPage(1); // Reset to page 1 on new file
      } catch (err) {
        console.error("Error loading PDF document:", err);
        setError("Failed to load PDF. The file might be corrupted or incompatible.");
      } finally {
        setIsLoading(false);
      }
    };

    loadPdf();
  }, [file]);

  // Sync pageInput when currentPage changes (e.g. via Next/Prev buttons)
  useEffect(() => {
    setPageInput(currentPage.toString());
  }, [currentPage]);

  // Effect to render the specific page when pdfDoc or currentPage changes
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let isCancelled = false;

    const renderPage = async () => {
      setError(null);

      try {
        const page = await pdfDoc.getPage(currentPage);
        if (isCancelled) return;

        const containerWidth = containerRef.current?.clientWidth || 600;
        // Calculate scale to fit container width, cap at 1.5
        const viewportUnscaled = page.getViewport({ scale: 1 });
        const scale = Math.min((containerWidth - 32) / viewportUnscaled.width, 1.5); 
        
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (canvas) {
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          if (context) {
            const renderContext = {
              canvasContext: context,
              viewport: viewport,
            };
            await page.render(renderContext).promise;
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("Error rendering page:", err);
          setError("Error rendering this page.");
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, currentPage]);

  // --- Dragging Logic ---

  const calculatePercentage = useCallback((clientX: number, clientY: number) => {
    if (!overlayRef.current) return;
    
    const rect = overlayRef.current.getBoundingClientRect();
    let newPercent = 0;

    if (orientation === SplitOrientation.Vertical) {
      const x = clientX - rect.left;
      newPercent = (x / rect.width) * 100;
    } else {
      const y = clientY - rect.top;
      newPercent = (y / rect.height) * 100;
    }

    // Clamp between 1 and 99
    newPercent = Math.max(1, Math.min(99, newPercent));
    onPercentageChange(Math.round(newPercent));
  }, [orientation, onPercentageChange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    calculatePercentage(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    calculatePercentage(e.touches[0].clientX, e.touches[0].clientY);
  };

  // Attach global listeners when dragging starts
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault(); // Prevent text selection
        calculatePercentage(e.clientX, e.clientY);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
        if (isDragging) {
            e.preventDefault(); // Prevent scrolling
            calculatePercentage(e.touches[0].clientX, e.touches[0].clientY);
        }
    }
    
    const handleTouchEnd = () => {
        setIsDragging(false);
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, calculatePercentage]);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(p => p - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(p => p + 1);
  };

  // Handle Input Changes
  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow empty string or digits only
    if (val === '' || /^\d+$/.test(val)) {
      setPageInput(val);
    }
  };

  // Validate and Submit Page Input
  const handlePageInputSubmit = () => {
    let pageNum = parseInt(pageInput, 10);
    
    if (isNaN(pageNum)) {
      setPageInput(currentPage.toString());
      return;
    }

    // Clamp value
    if (pageNum < 1) pageNum = 1;
    if (pageNum > totalPages) pageNum = totalPages;

    setCurrentPage(pageNum);
    setPageInput(pageNum.toString());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handlePageInputSubmit();
      (e.currentTarget as HTMLInputElement).blur();
    }
  };

  if (!file) return null;

  const cursorStyle = orientation === SplitOrientation.Vertical ? 'cursor-col-resize' : 'cursor-row-resize';

  return (
    <div className="w-full flex flex-col items-center justify-center p-4 bg-gray-50 rounded-xl border border-gray-200 shadow-inner min-h-[300px]" ref={containerRef}>
      <div className="w-full flex items-center justify-between mb-4 px-2">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          Interactive Preview
        </h3>
        {totalPages > 0 && (
           <span className="text-xs font-medium text-gray-400">
             Page {currentPage} of {totalPages}
           </span>
        )}
      </div>
      
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <LoaderIcon className="w-8 h-8 mb-2 text-indigo-500" />
          <p>Loading PDF...</p>
        </div>
      ) : error ? (
        <div className="text-red-500 bg-red-50 p-4 rounded-lg border border-red-100">
          {error}
        </div>
      ) : (
        <div className="flex flex-col items-center w-full select-none">
          <div 
            className="relative shadow-2xl transition-all duration-300 mb-4 group"
            ref={overlayRef}
          >
            <canvas 
              ref={canvasRef} 
              className="rounded-sm bg-white block max-w-full h-auto pointer-events-none"
            />
            
            {/* Interactive Area Layer */}
            <div 
                className={`absolute inset-0 z-20 ${cursorStyle}`}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
            ></div>

            {/* Split Line Overlay */}
            <div 
              className={`absolute bg-red-500 pointer-events-none transition-none z-10 shadow-[0_0_10px_rgba(220,38,38,0.7)]`}
              style={{
                left: orientation === SplitOrientation.Vertical ? `${percentage}%` : '0',
                top: orientation === SplitOrientation.Horizontal ? `${percentage}%` : '0',
                width: orientation === SplitOrientation.Vertical ? '2px' : '100%',
                height: orientation === SplitOrientation.Horizontal ? '2px' : '100%',
              }}
            >
               {/* Drag Handle (Circle) */}
               <div className={`absolute bg-white border-4 border-red-500 rounded-full w-6 h-6 shadow-md
                  ${orientation === SplitOrientation.Vertical 
                    ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' 
                    : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'}
               `}></div>

               {/* Label for the line */}
               <div className={`absolute bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap
                  ${orientation === SplitOrientation.Vertical 
                    ? 'top-0 -translate-x-1/2 -translate-y-full mt-[-8px]' 
                    : 'left-0 -translate-y-1/2 -translate-x-full ml-[-8px]'}
               `}>
                 {percentage}%
               </div>
            </div>
            
             {/* Left/Top Part Highlight */}
             <div 
               className="absolute bg-indigo-500 mix-blend-multiply opacity-10 pointer-events-none transition-none"
               style={{
                  left: 0,
                  top: 0,
                  width: orientation === SplitOrientation.Vertical ? `${percentage}%` : '100%',
                  height: orientation === SplitOrientation.Horizontal ? `${percentage}%` : '100%',
               }}
             />
             {/* Right/Bottom Part Highlight */}
             <div 
               className="absolute bg-emerald-500 mix-blend-multiply opacity-10 pointer-events-none transition-none"
               style={{
                  left: orientation === SplitOrientation.Vertical ? `${percentage}%` : '0',
                  top: orientation === SplitOrientation.Horizontal ? `${percentage}%` : '0',
                  width: orientation === SplitOrientation.Vertical ? `${100 - percentage}%` : '100%',
                  height: orientation === SplitOrientation.Horizontal ? `${100 - percentage}%` : '100%',
               }}
             />
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100 z-30 mt-[-20px] mb-2">
             <button
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Previous Page"
             >
                <ChevronLeftIcon className="w-5 h-5" />
             </button>
             
             {/* Input Area */}
             <div className="flex items-center justify-center space-x-1 mx-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={pageInput}
                  onChange={handlePageInputChange}
                  onBlur={handlePageInputSubmit}
                  onKeyDown={handleKeyDown}
                  className="w-12 text-center text-sm font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-md focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all py-1"
                  aria-label="Current Page Number"
                />
                <span className="text-sm font-semibold text-gray-400 select-none">
                  / {totalPages}
                </span>
             </div>

             <button
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Next Page"
             >
                <ChevronRightIcon className="w-5 h-5" />
             </button>
          </div>
        </div>
      )}
      
      <p className="mt-4 text-xs text-gray-400 text-center max-w-md">
        Drag the red line to adjust the split position.
      </p>
    </div>
  );
};
