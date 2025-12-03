import { PDFDocument } from 'pdf-lib';
import { SplitOrientation } from '../types';

export const splitPdfDocument = async (
  file: File,
  orientation: SplitOrientation,
  percentage: number
): Promise<Uint8Array> => {
  const arrayBuffer = await file.arrayBuffer();
  const originalDoc = await PDFDocument.load(arrayBuffer);
  const newDoc = await PDFDocument.create();
  
  // Copy all pages from original to allow copying them multiple times
  const pageCount = originalDoc.getPageCount();
  const pageIndices = Array.from({ length: pageCount }, (_, i) => i);

  for (const pageIndex of pageIndices) {
    // We copy the page twice for every original page
    const [page1, page2] = await newDoc.copyPages(originalDoc, [pageIndex, pageIndex]);
    
    const { width, height } = page1.getSize();
    
    if (orientation === SplitOrientation.Vertical) {
      const splitX = width * (percentage / 100);

      // Left Page (0 to splitX)
      page1.setMediaBox(0, 0, splitX, height);
      
      // Right Page (splitX to width)
      // Note: We keep the coordinate system but restrict the view
      page2.setMediaBox(splitX, 0, width - splitX, height);
      
    } else {
      const splitY = height * (percentage / 100);

      // In PDF, (0,0) is usually bottom-left. 
      // Top part means Y goes from splitY to height
      // Bottom part means Y goes from 0 to splitY
      
      // Note: The user usually thinks "Top" comes first in the PDF.
      // Top Page (splitY to height)
      page1.setMediaBox(0, splitY, width, height - splitY);

      // Bottom Page (0 to splitY)
      page2.setMediaBox(0, 0, width, splitY);
    }

    // Add pages in logical order (Left->Right or Top->Bottom)
    // For vertical: Left first.
    // For horizontal: Top first (higher Y values).
    newDoc.addPage(page1);
    newDoc.addPage(page2);
  }

  const pdfBytes = await newDoc.save();
  return pdfBytes;
};

export const downloadBlob = (data: Uint8Array, originalName: string, orientation: string, percentage: number) => {
  const blob = new Blob([data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  const nameWithoutExt = originalName.replace(/\.pdf$/i, '');
  link.download = `${nameWithoutExt}_split_${orientation}_${percentage}.pdf`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};