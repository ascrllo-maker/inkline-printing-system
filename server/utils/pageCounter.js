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
      
      // Always try to extract page count from PDF structure first (most reliable)
      let pageCountFromStructure = null;
      try {
        const pdfText = fileBuffer.toString('latin1'); // Use latin1 to preserve binary data
        
        // Method 1: Look for /Count in page tree (most reliable for multi-page PDFs)
        const countMatches = pdfText.match(/\/Count\s+(\d+)/g);
        if (countMatches && countMatches.length > 0) {
          const counts = countMatches.map(m => {
            const match = m.match(/\d+/);
            return match ? parseInt(match[0]) : 0;
          }).filter(c => c > 0 && c < 100000); // Reasonable page count limit
          
          if (counts.length > 0) {
            // Find the maximum count that appears in a page tree context
            // Look for patterns like "/Count 7" near "/Kids" or "/Pages" which indicate page tree nodes
            const pageTreePattern = /\/Type\s*\/Pages[^/]*\/Count\s+(\d+)/g;
            const pageTreeMatches = [];
            let match;
            while ((match = pageTreePattern.exec(pdfText)) !== null) {
              pageTreeMatches.push(parseInt(match[1]));
            }
            
            if (pageTreeMatches.length > 0) {
              pageCountFromStructure = Math.max(...pageTreeMatches);
              console.log(`Found page count from PDF page tree structure: ${pageCountFromStructure} pages`);
            } else {
              // Fallback: use the maximum count found
              pageCountFromStructure = Math.max(...counts);
              console.log(`Found page count from PDF structure (alternative method): ${pageCountFromStructure} pages`);
            }
          }
        }
        
        // Method 2: Count page objects directly (backup method)
        if (!pageCountFromStructure) {
          const pageObjMatches = pdfText.match(/\/Type\s*\/Page[^s\w]/g);
          if (pageObjMatches && pageObjMatches.length > 0) {
            pageCountFromStructure = pageObjMatches.length;
            console.log(`Found page count by counting page objects: ${pageCountFromStructure} pages`);
          }
        }
        
        // Method 3: Look for page numbers in content streams (less reliable)
        if (!pageCountFromStructure) {
          const pageNumberMatches = pdfText.match(/\/Page\s+(\d+)/g);
          if (pageNumberMatches && pageNumberMatches.length > 0) {
            const pageNumbers = pageNumberMatches.map(m => {
              const match = m.match(/\d+/);
              return match ? parseInt(match[0]) : 0;
            }).filter(n => n > 0 && n < 100000);
            
            if (pageNumbers.length > 0) {
              pageCountFromStructure = Math.max(...pageNumbers);
              console.log(`Found page count from page numbers: ${pageCountFromStructure} pages`);
            }
          }
        }
      } catch (structureError) {
        console.error('Error extracting page count from PDF structure:', structureError.message);
      }
      
      // Now try pdf-parse as a secondary method
      let pageCountFromParse = null;
      try {
        const data = await pdfParse(fileBuffer);
        pageCountFromParse = data.numpages || null;
        console.log(`PDF parsed with pdf-parse: ${fileName} - numpages: ${data.numpages}`);
        console.log(`PDF metadata:`, {
          numpages: data.numpages,
          info: data.info ? Object.keys(data.info).join(', ') : 'none',
          hasMetadata: !!data.metadata
        });
      } catch (pdfError) {
        console.error(`Error parsing PDF with pdf-parse ${fileName}:`, pdfError.message);
        // Continue with structure-based count
      }
      
      // Use the highest reliable count
      let finalPageCount = 1;
      if (pageCountFromStructure && pageCountFromStructure > 0) {
        finalPageCount = pageCountFromStructure;
        console.log(`Using page count from PDF structure: ${finalPageCount} pages`);
      } else if (pageCountFromParse && pageCountFromParse > 0) {
        finalPageCount = pageCountFromParse;
        console.log(`Using page count from pdf-parse: ${finalPageCount} pages`);
      } else {
        console.warn(`Could not determine page count for ${fileName}. Using default: 1 page`);
      }
      
      // Final validation: if both methods disagree significantly, log a warning
      if (pageCountFromStructure && pageCountFromParse && 
          Math.abs(pageCountFromStructure - pageCountFromParse) > 2) {
        console.warn(`Page count mismatch: Structure=${pageCountFromStructure}, Parse=${pageCountFromParse}. Using structure count.`);
      }
      
      return finalPageCount;
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

