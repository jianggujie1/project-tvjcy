const { PDFDocument } = PDFLib;

let pdfFile = null;
let originalSize = 0;

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const pdfName = document.getElementById('pdfName');
const pdfSize = document.getElementById('pdfSize');
const removeFileBtn = document.getElementById('removeFile');
const qualitySection = document.getElementById('qualitySection');
const toolActions = document.getElementById('toolActions');
const compressBtn = document.getElementById('compressBtn');
const clearBtn = document.getElementById('clearBtn');
const result = document.getElementById('result');
const resultText = document.getElementById('resultText');
const resultSavings = document.getElementById('resultSavings');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const loading = document.getElementById('loading');

// File Input
fileInput.addEventListener('change', async (e) => {
    if (e.target.files.length > 0) {
        await loadPdf(e.target.files[0]);
    }
});

// Drag & Drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
        await loadPdf(file);
    }
});

// Click drop zone to browse (prevent double dialog)
dropZone.addEventListener('click', (e) => {
    if (e.target === dropZone || e.target.classList.contains('drop-zone-content')) {
        e.stopPropagation();
        fileInput.click();
    }
});

// Load PDF
async function loadPdf(file) {
    pdfFile = file;
    originalSize = file.size;

    pdfName.textContent = file.name;
    pdfSize.textContent = formatSize(file.size);

    dropZone.style.display = 'none';
    fileInfo.style.display = 'block';
    qualitySection.style.display = 'block';
    toolActions.style.display = 'flex';
    result.style.display = 'none';
}

// Format file size
function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// Clear
clearBtn.addEventListener('click', resetUI);

// Reset UI
function resetUI() {
    pdfFile = null;
    originalSize = 0;
    fileInput.value = '';

    dropZone.style.display = 'block';
    fileInfo.style.display = 'none';
    qualitySection.style.display = 'none';
    toolActions.style.display = 'none';
    result.style.display = 'none';
}

// Remove file
removeFileBtn.addEventListener('click', resetUI);

// Compress PDF
compressBtn.addEventListener('click', async () => {
    if (!pdfFile) return;

    const quality = document.querySelector('input[name="quality"]:checked').value;

    loading.style.display = 'block';
    toolActions.style.display = 'none';
    result.style.display = 'none';

    try {
        const pdfBytes = await pdfFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(pdfBytes);

        // Remove metadata for size reduction
        pdfDoc.setTitle('');
        pdfDoc.setAuthor('');
        pdfDoc.setSubject('');
        pdfDoc.setKeywords([]);
        pdfDoc.setProducer('');
        pdfDoc.setCreator('');

        // Save with compression
        // pdf-lib doesn't support image compression directly in browser
        // but we can reduce size by removing unnecessary data
        const saveOptions = {
            useObjectStreams: true
        };

        const compressedBytes = await pdfDoc.save(saveOptions);
        const compressedSize = compressedBytes.length;

        // For extreme compression, we'd need to re-encode images
        // This is a simplified version that removes metadata and compresses streams
        const blob = new Blob([compressedBytes], { type: 'application/pdf' });

        loading.style.display = 'none';
        result.style.display = 'block';

        // Calculate savings
        const savedBytes = originalSize - compressedSize;
        const savingsPercent = Math.round((savedBytes / originalSize) * 100);

        if (savingsPercent > 0) {
            resultText.textContent = 'PDF compressed successfully!';
            resultSavings.textContent = `Saved ${savingsPercent}% (${formatSize(savedBytes)})`;
            resultSavings.style.display = 'block';
        } else {
            resultText.textContent = 'PDF is already optimized!';
            resultSavings.style.display = 'none';
        }

        downloadBtn.onclick = () => {
            downloadBlob(blob, 'compressed.pdf');
        };
    } catch (error) {
        loading.style.display = 'none';
        toolActions.style.display = 'flex';
        alert('Error compressing PDF: ' + error.message);
    }
});

// Download helper
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// Reset - process another
resetBtn.addEventListener('click', () => {
    pdfFile = null;
    pdfDoc = null;
    originalSize = 0;
    fileInput.value = '';
    dropZone.style.display = 'block';
    fileInfo.style.display = 'none';
    qualitySection.style.display = 'none';
    result.style.display = 'none';
    toolActions.style.display = 'none';
});