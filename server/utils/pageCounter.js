import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

/**
 * Count pages in a file based on its type
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} mimeType - MIME type of the file
 * @param {string} fileName - Original file name
 * @returns {Promise<number>} Number of pages
 */
export const countPages = async (fileBuffer, mimeType, fileName) => {
  try {
    // Validate file buffer
    if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
      console.error('Invalid file buffer provided to countPages');
      return 1;
    }

    // PDF files
    if (mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
      console.log(`Attempting to parse PDF: ${fileName}, MIME type: ${mimeType}, Buffer size: ${fileBuffer.length} bytes`);
      
      // Verify it's actually a PDF by checking the file header
      const pdfHeader = fileBuffer.toString('ascii', 0, 4);
      if (pdfHeader !== '%PDF') {
        console.warn(`File ${fileName} does not have PDF header. Header: ${pdfHeader}`);
        // Still try to parse it in case it's a valid PDF with unusual structure
      }
      
      try {
        // Parse PDF - pdf-parse automatically extracts page count
        const data = await pdfParse(fileBuffer);
        
        // Get page count - pdf-parse stores it in numpages
        const pageCount = data.numpages || 1;
        console.log(`PDF parsed: ${fileName} - numpages: ${data.numpages}, pageCount: ${pageCount}`);
        console.log(`PDF metadata:`, {
          numpages: data.numpages,
          info: data.info ? JSON.stringify(data.info).substring(0, 200) : 'none',
          metadata: data.metadata ? JSON.stringify(data.metadata).substring(0, 200) : 'none'
        });
        
        // Double-check: if numpages seems wrong for large files, try alternative method
        if (pageCount === 1 && fileBuffer.length > 50000) {
          // Large file but only 1 page? This might be wrong - try extracting from PDF structure
          console.warn(`Warning: Large PDF file (${fileBuffer.length} bytes) detected as 1 page. Attempting alternative count method.`);
          
          try {
            // Convert buffer to string to search for page count indicators
            const pdfText = fileBuffer.toString('latin1'); // Use latin1 to preserve binary data
            
            // Method 1: Look for /Count in page tree (most reliable)
            const countMatches = pdfText.match(/\/Count\s+(\d+)/g);
            if (countMatches && countMatches.length > 0) {
              const counts = countMatches.map(m => {
                const match = m.match(/\d+/);
                return match ? parseInt(match[0]) : 0;
              }).filter(c => c > 0);
              
              if (counts.length > 0) {
                const maxCount = Math.max(...counts);
                // Only use if it's significantly larger than the parsed count
                if (maxCount > pageCount && maxCount < 10000) {
                  console.log(`Found alternative page count from PDF structure: ${maxCount} pages (was ${pageCount})`);
                  return maxCount;
                }
              }
            }
            
            // Method 2: Count page objects (less reliable but useful as fallback)
            const pageObjMatches = pdfText.match(/\/Type\s*\/Page[^s]/g);
            if (pageObjMatches && pageObjMatches.length > pageCount) {
              console.log(`Found ${pageObjMatches.length} page objects in PDF (parsed count was ${pageCount})`);
              // Use the higher count if reasonable
              if (pageObjMatches.length < 10000 && pageObjMatches.length > pageCount) {
                return pageObjMatches.length;
              }
            }
          } catch (altError) {
            console.error('Error in alternative page counting method:', altError.message);
          }
        }
        
        return pageCount;
      } catch (pdfError) {
        console.error(`Error parsing PDF ${fileName}:`, pdfError);
        console.error('PDF Error details:', {
          message: pdfError.message,
          stack: pdfError.stack,
          fileName: fileName,
          bufferLength: fileBuffer.length,
          mimeType: mimeType,
          pdfHeader: fileBuffer.toString('ascii', 0, 10)
        });
        // Re-throw to be caught by outer catch
        throw pdfError;
      }
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
    console.warn(`Unknown file type for page counting: ${mimeType || 'unknown'}, fileName: ${fileName || 'unknown'}. Defaulting to 1 page.`);
    return 1;
  } catch (error) {
    console.error('Error counting pages:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      fileName: fileName,
      mimeType: mimeType,
      bufferType: fileBuffer ? typeof fileBuffer : 'null',
      bufferLength: fileBuffer ? fileBuffer.length : 0,
      isBuffer: fileBuffer ? Buffer.isBuffer(fileBuffer) : false
    });
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

