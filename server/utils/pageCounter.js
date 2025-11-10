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
      
      // Extract page count from PDF structure (primary method - most reliable)
      let pageCountFromStructure = null;
      try {
        // Convert buffer to string - use binary encoding to preserve PDF structure
        const pdfText = fileBuffer.toString('binary');
        
        console.log(`Analyzing PDF structure for ${fileName} (${fileBuffer.length} bytes)...`);
        
        // PRIORITY METHOD: Extract /Count from page tree (most reliable)
        // PDFs store total page count in the root page tree node as /Count <number>
        // Look for all /Count values and use the maximum (root page tree has the total)
        const countPattern = /\/Count\s+(\d+)/g;
        const countMatches = [];
        let match;
        while ((match = countPattern.exec(pdfText)) !== null) {
          const count = parseInt(match[1]);
          if (count > 0 && count < 100000) {
            countMatches.push({
              count: count,
              position: match.index,
              context: pdfText.substring(Math.max(0, match.index - 50), Math.min(pdfText.length, match.index + 100))
            });
          }
        }
        
        if (countMatches.length > 0) {
          // Sort by count (descending) - the largest is usually the total page count
          countMatches.sort((a, b) => b.count - a.count);
          const maxCount = countMatches[0].count;
          
          // Verify it's in a page tree context (look for /Type /Pages nearby)
          const hasPageTreeContext = countMatches.some(m => {
            const context = m.context.toLowerCase();
            return context.includes('/type') && context.includes('/pages');
          });
          
          if (hasPageTreeContext || countMatches.length === 1) {
            pageCountFromStructure = maxCount;
            console.log(`✓ Found page count from /Count in page tree: ${pageCountFromStructure} pages`);
            console.log(`  (Checked ${countMatches.length} /Count values, max: ${maxCount})`);
          } else {
            // Use the max count anyway if it's reasonable
            pageCountFromStructure = maxCount;
            console.log(`✓ Found page count from /Count values: ${pageCountFromStructure} pages`);
            console.log(`  (Checked ${countMatches.length} /Count values, using max: ${maxCount})`);
          }
        }
        
        // FALLBACK METHOD 1: Count /Type /Page objects (each page has one)
        if (!pageCountFromStructure || pageCountFromStructure === 1) {
          // Multiple patterns to catch different PDF formats
          const pageTypePatterns = [
            /\/Type\s*\/Page\s*(?:>>|R|obj|endobj)/g,
            /\/Type\s*\/Page\s*$/gm,
            /\/Type[\/\s]+Page[^a-z]/gi
          ];
          
          const pageObjects = new Set();
          for (const pattern of pageTypePatterns) {
            let m;
            while ((m = pattern.exec(pdfText)) !== null) {
              // Use a range to avoid counting same object multiple times
              const rangeStart = Math.floor(m.index / 1000) * 1000;
              pageObjects.add(rangeStart);
            }
          }
          
          if (pageObjects.size > 0) {
            const pageObjCount = pageObjects.size;
            console.log(`Found ${pageObjCount} pages by counting /Type /Page objects`);
            
            // Use this if we don't have a structure count, or if it's larger
            if (!pageCountFromStructure || pageObjCount > pageCountFromStructure) {
              pageCountFromStructure = pageObjCount;
              console.log(`✓ Using page object count: ${pageCountFromStructure} pages`);
            }
          }
        }
        
        // FALLBACK METHOD 2: Count page objects with endobj
        if (!pageCountFromStructure || pageCountFromStructure === 1) {
          const pageEndObjPattern = /\/Type\s*\/Page[\s\S]{0,2000}?endobj/gi;
          const pageEndObjMatches = pdfText.match(pageEndObjPattern);
          if (pageEndObjMatches && pageEndObjMatches.length > 0) {
            const count = pageEndObjMatches.length;
            console.log(`Found ${count} pages by counting page dictionaries with endobj`);
            if (count > pageCountFromStructure) {
              pageCountFromStructure = count;
              console.log(`✓ Using endobj count: ${pageCountFromStructure} pages`);
            }
          }
        }
        
        if (pageCountFromStructure && pageCountFromStructure > 1) {
          console.log(`✅ Final structure-based page count: ${pageCountFromStructure} pages`);
        } else if (pageCountFromStructure === 1) {
          console.warn(`⚠️ Structure parsing found only 1 page - this might be inaccurate for ${fileName}`);
        } else {
          console.warn(`⚠️ Could not extract page count from PDF structure for ${fileName}`);
        }
      } catch (structureError) {
        console.error('❌ Error extracting page count from PDF structure:', structureError.message);
        console.error('Structure error stack:', structureError.stack);
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

