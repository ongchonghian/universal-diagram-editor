/**
 * File Processing Utilities for PDF and Image ingestion
 * Handles OCR for images and text extraction for PDFs
 */

// For PDF processing
const PDFJS_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
const PDF_WORKER_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

// For image OCR (using Tesseract.js)
const TESSERACT_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.esm.min.js';

class FileProcessor {
    constructor() {
        this.pdfjs = null;
        this.tesseract = null;
        this.isLoading = {
            pdf: false,
            tesseract: false
        };
    }

    /**
     * Load PDF.js library dynamically
     */
    async loadPdfJS() {
        if (this.pdfjs) return this.pdfjs;
        if (this.isLoading.pdf) {
            // Wait for existing load
            while (this.isLoading.pdf) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return this.pdfjs;
        }

        this.isLoading.pdf = true;
        try {
            // Load PDF.js
            if (!window.pdfjsLib) {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = PDFJS_URL;
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            }

            // Set worker
            if (window.pdfjsLib) {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
                this.pdfjs = window.pdfjsLib;
            }

            return this.pdfjs;
        } finally {
            this.isLoading.pdf = false;
        }
    }

    /**
     * Load Tesseract.js for OCR
     */
    async loadTesseract() {
        if (this.tesseract) return this.tesseract;
        if (this.isLoading.tesseract) {
            // Wait for existing load
            while (this.isLoading.tesseract) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return this.tesseract;
        }

        this.isLoading.tesseract = true;
        try {
            if (!this.tesseract) {
                // Use dynamic import to avoid AMD loader conflicts with Monaco editor
                const module = await import(/* @vite-ignore */ TESSERACT_URL);
                this.tesseract = module.default || module;
            }

            return this.tesseract;
        } catch (error) {
            console.error('Failed to load Tesseract.js:', error);
            throw new Error('Failed to load Tesseract.js library');
        } finally {
            this.isLoading.tesseract = false;
        }
    }

    /**
     * Process PDF file and extract text
     * @param {File} file - PDF file
     * @returns {Promise<string>} Extracted text
     */
    async processPDF(file) {
        try {
            const pdfjs = await this.loadPdfJS();
            if (!pdfjs) {
                throw new Error('Failed to load PDF.js library');
            }

            // Read file as array buffer
            const arrayBuffer = await file.arrayBuffer();
            
            // Load PDF document
            const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
            
            let fullText = '';
            
            // Extract text from each page
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                
                // Extract text items
                const pageText = textContent.items
                    .map(item => item.str)
                    .join(' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                
                if (pageText) {
                    fullText += `\n\n--- Page ${i} ---\n${pageText}`;
                }
            }
            
            return fullText.trim();
        } catch (error) {
            console.error('PDF processing error:', error);
            throw new Error(`Failed to process PDF: ${error.message}`);
        }
    }

    /**
     * Process image file with OCR
     * @param {File} file - Image file (png, jpg, jpeg, gif, webp)
     * @returns {Promise<string>} Extracted text
     */
    async processImage(file) {
        try {
            const tesseract = await this.loadTesseract();
            if (!tesseract) {
                throw new Error('Failed to load Tesseract.js library');
            }

            return new Promise((resolve, reject) => {
                tesseract.recognize(
                    file,
                    'eng',
                    {
                        logger: (info) => {
                            // Progress updates could be handled here
                            if (info.status === 'recognizing text') {
                                console.log(`OCR Progress: ${Math.round(info.progress * 100)}%`);
                            }
                        }
                    }
                ).then(({ data: { text } }) => {
                    resolve(text.trim());
                }).catch(reject);
            });
        } catch (error) {
            console.error('Image OCR error:', error);
            throw new Error(`Failed to process image: ${error.message}`);
        }
    }

    /**
     * Read image file as Base64 Data URL
     * @param {File} file - Image file
     * @returns {Promise<string>} Base64 Data URL
     */
    async processImageBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Process file based on type
     * @param {File} file 
     * @param {Object} options - Processing options (e.g., skipOCR)
     * @returns {Promise<{text: string, type: string, filename: string, isBase64?: boolean}>}
     */
    async processFile(file, options = {}) {
        const fileType = this.getFileType(file);
        
        try {
            let text = '';
            let isBase64 = false;
            
            if (fileType === 'pdf') {
                text = await this.processPDF(file);
            } else if (fileType === 'image') {
                if (options.skipOCR) {
                    text = await this.processImageBase64(file);
                    isBase64 = true;
                } else {
                    text = await this.processImage(file);
                }
            } else {
                throw new Error(`Unsupported file type: ${file.type}`);
            }
            
            return {
                text: text,
                type: fileType,
                filename: file.name,
                size: file.size,
                isBase64
            };
        } catch (error) {
            throw new Error(`Error processing ${file.name}: ${error.message}`);
        }
    }

    /**
     * Get file type category
     * @param {File} file 
     * @returns {string} 'pdf', 'image', or 'unknown'
     */
    getFileType(file) {
        const type = file.type.toLowerCase();
        
        if (type === 'application/pdf') {
            return 'pdf';
        }
        
        if (type.startsWith('image/')) {
            return 'image';
        }
        
        return 'unknown';
    }

    /**
     * Check if file type is supported
     * @param {File} file 
     * @returns {boolean}
     */
    isSupported(file) {
        return this.getFileType(file) !== 'unknown';
    }

    /**
     * Format file size for display
     * @param {number} bytes 
     * @returns {string}
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Validate file before processing
     * @param {File} file 
     * @returns {Array<string>} Array of validation errors
     */
    validateFile(file) {
        const errors = [];
        
        // Check file type
        if (!this.isSupported(file)) {
            errors.push('Unsupported file type. Please upload PDF or image files (PNG, JPG, JPEG, GIF, WebP).');
        }
        
        // Check file size (10MB limit)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            errors.push(`File size (${this.formatFileSize(file.size)}) exceeds 10MB limit.`);
        }
        
        return errors;
    }
}

export const fileProcessor = new FileProcessor();
