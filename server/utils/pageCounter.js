import fs from 'fs';

/**
 * Count pages in a file based on its type
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} mimeType - MIME type of the file
 * @param {string} fileName - Original file name
 * @returns {Promise<number>} Number of pages
 */
export const countPages = async (fileBuffer, mimeType, fileName) => {
  try {
    // PDF files
    if (mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
      // Dynamic import for pdf-parse (CommonJS module)
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(fileBuffer);
      return data.numpages || 1;
    }
    
    // Image files - count as 1 page
    if (mimeType.startsWith('image/')) {
      return 1;
    }
    
    // Text files - estimate based on content length (rough estimate: 1 page per 2000 characters)
    if (mimeType === 'text/plain' || fileName.toLowerCase().endsWith('.txt')) {
      const text = fileBuffer.toString('utf-8');
      const estimatedPages = Math.ceil(text.length / 2000);
      return Math.max(1, estimatedPages);
    }
    
    // Office documents (Word, PowerPoint, Excel)
    // For now, we'll use a default estimation or require parsing libraries
    // These files are complex and require specialized libraries
    // For simplicity, we'll estimate based on file size
    if (
      mimeType === 'application/msword' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/vnd.ms-powerpoint' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      mimeType === 'application/vnd.ms-excel' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      // Rough estimate: 1 page per 50KB for Word/PowerPoint, 1 page per 100KB for Excel
      const fileSizeKB = fileBuffer.length / 1024;
      if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
        return Math.max(1, Math.ceil(fileSizeKB / 100));
      } else {
        return Math.max(1, Math.ceil(fileSizeKB / 50));
      }
    }
    
    // Default: 1 page for unknown file types
    console.warn(`Unknown file type for page counting: ${mimeType}. Defaulting to 1 page.`);
    return 1;
  } catch (error) {
    console.error('Error counting pages:', error);
    // Default to 1 page if counting fails
    return 1;
  }
};

/**
 * Validate page numbers to print
 * @param {number[]} pagesToPrint - Array of page numbers
 * @param {number} totalPages - Total pages in the file
 * @returns {number[]} Validated and sorted array of page numbers
 */
export const validatePagesToPrint = (pagesToPrint, totalPages) => {
  if (!pagesToPrint || pagesToPrint.length === 0) {
    // Return all pages if none specified
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  
  // Filter out invalid page numbers and duplicates
  const validPages = pagesToPrint
    .filter(page => page >= 1 && page <= totalPages)
    .filter((page, index, self) => self.indexOf(page) === index) // Remove duplicates
    .sort((a, b) => a - b); // Sort ascending
  
  return validPages.length > 0 ? validPages : [1]; // Default to page 1 if all invalid
};

