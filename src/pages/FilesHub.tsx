import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UploadCloud, 
  FileText, 
  Image as ImageIcon, 
  Download, 
  Trash2, 
  Clock, 
  Database, 
  Search, 
  File, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  HelpCircle, 
  FileSpreadsheet, 
  Activity, 
  Check, 
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Sparkles,
  Video as VideoIcon,
  Music as AudioIcon,
  Eye,
  HardDrive,
  ArrowLeft,
  MoreVertical,
  Copy
} from 'lucide-react';
import { useAuth } from '../lib/useAuth';
import { collection, query, where, onSnapshot, orderBy, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  FileRecord, 
  uploadUserFile, 
  logFileDownload, 
  deleteUserFile, 
  formatBytes,
  fetchFileFromChunks
} from '../lib/fileService';
import { cn } from '../lib/utils';
import { useErrorUX } from '../lib/ErrorUXContext';
// @ts-ignore
import { renderAsync } from 'docx-preview';
import * as XLSX from 'xlsx';

interface DocxViewerProps {
  url: string;
}

function DocxViewer({ url }: DocxViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    async function loadDocx() {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to download file stream (Status ${response.status})`);
        }
        const blob = await response.blob();
        if (!active) return;

        if (containerRef.current) {
          containerRef.current.innerHTML = ''; // Clear previous render
          // Render docx directly to HTML client-side
          await renderAsync(blob, containerRef.current, undefined, {
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false
          });
          
          // Apply readable styling to the rendered word elements
          const els = containerRef.current.querySelectorAll('*');
          els.forEach((el: any) => {
            if (el.style) {
              if (el.style.color === 'white' || el.style.color === 'rgb(255, 255, 255)') {
                el.style.color = '#1f2937';
              }
            }
          });
        }
        if (active) setLoading(false);
      } catch (err: any) {
        console.error('Docx rendering error:', err);
        if (active) {
          setError(err?.message || 'Unsupported or corrupted Word document format.');
          setLoading(false);
        }
      }
    }

    loadDocx();

    return () => {
      active = false;
    };
  }, [url]);

  return (
    <div className="w-full flex flex-col h-[52vh] bg-white rounded-2xl overflow-y-auto relative text-gray-800 shadow-inner">
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/95 z-10 space-y-4">
          <RefreshCw className="w-8 h-8 text-teal-500 animate-spin" />
          <p className="text-gray-650 font-mono text-[11px] tracking-wider uppercase">Loading Word Document...</p>
        </div>
      )}
      {error ? (
        <div className="p-8 text-center space-y-4 max-w-md mx-auto my-auto text-gray-800 flex flex-col items-center justify-center h-full">
          <AlertCircle className="w-12 h-12 text-rose-500" />
          <h4 className="font-serif text-lg font-light text-gray-950">Unable to Parse Document</h4>
          <p className="text-xs text-gray-500 leading-relaxed">{error}</p>
          <p className="text-xs text-teal-600 font-medium font-serif italic">
            Enjoy full support by downloading to your machine.
          </p>
        </div>
      ) : (
        <div 
          ref={containerRef} 
          className="docx-viewer-content p-4 w-full min-h-full select-text leading-relaxed font-sans text-sm text-left"
          style={{ 
            color: '#1f2937',
            background: '#ffffff'
          }} 
        />
      )}
    </div>
  );
}

interface XlsxViewerProps {
  url: string;
}

function XlsxViewer({ url }: XlsxViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheets, setSheets] = useState<{ name: string; rows: any[][] }[]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    async function loadXlsx() {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch Excel sheet data (Status ${response.status})`);
        }
        const buffer = await response.arrayBuffer();
        if (!active) return;

        const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
        const sheetList = workbook.SheetNames.map((name) => {
          const worksheet = workbook.Sheets[name];
          const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
          return { name, rows };
        });

        if (active) {
          setSheets(sheetList);
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Xlsx parsing failure:', err);
        if (active) {
          setError(err?.message || 'Unsupported or corrupted spreadsheet registry.');
          setLoading(false);
        }
      }
    }

    loadXlsx();
    return () => {
      active = false;
    };
  }, [url]);

  if (loading) {
    return (
      <div className="w-full flex flex-col items-center justify-center h-[52vh] bg-stone-900 border border-white/5 rounded-2xl relative space-y-4">
        <RefreshCw className="w-8 h-8 text-amber-accent animate-spin" />
        <p className="text-gray-400 font-mono text-[11px] tracking-wider uppercase">Rebuilding Spreadsheet Rows...</p>
      </div>
    );
  }

  if (error || sheets.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center h-[52vh] bg-stone-900 border border-white/5 rounded-2xl p-8 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500" />
        <h4 className="font-serif text-lg font-light text-white">Spreadsheet Preview Blocked</h4>
        <p className="text-xs text-gray-400 leading-relaxed max-w-sm">
          {error || 'This spreadsheet does not contain any valid sheets or readable cells.'}
        </p>
      </div>
    );
  }

  const currentSheet = sheets[activeSheetIndex];
  const filteredRows = searchQuery.trim() === ''
    ? currentSheet.rows
    : currentSheet.rows.filter((row, rIdx) => {
        if (rIdx === 0) return true;
        return row.some(cell => String(cell).toLowerCase().includes(searchQuery.toLowerCase()));
      });

  const headerRow = currentSheet.rows[0] || [];
  const dataRows = filteredRows.slice(1);

  return (
    <div className="w-full flex flex-col h-[52vh] bg-stone-950 border border-white/10 rounded-2xl overflow-hidden text-slate-100 shadow-2xl relative">
      <div className="p-4 border-b border-white/5 bg-stone-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap gap-1.5 max-w-full overflow-x-auto no-scrollbar">
          {sheets.map((sheet, index) => (
            <button
              key={sheet.name}
              type="button"
              onClick={() => {
                setActiveSheetIndex(index);
                setSearchQuery('');
              }}
              className={cn(
                "px-3 py-1.5 rounded-xl text-[11px] font-medium tracking-wide transition-all",
                activeSheetIndex === index
                  ? "bg-amber-accent text-black font-semibold shadow-md shadow-amber-accent/15"
                  : "bg-white/5 text-slate-300 hover:bg-white/10"
              )}
            >
              {sheet.name}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-48">
          <input
            type="text"
            placeholder="Search rows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:border-amber-accent outline-none transition-all placeholder-white/30"
          />
          <svg className="w-3.5 h-3.5 text-white/30 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-1 text-slate-350 font-sans text-xs no-scrollbar">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 bg-stone-900 border-b border-white/10 z-10">
            <tr>
              <th className="p-3 w-12 text-center text-[10px] uppercase tracking-wider text-white/30 select-none border-r border-white/5">
                #
              </th>
              {headerRow.map((col, idx) => (
                <th key={idx} className="p-3 font-semibold text-slate-200 uppercase tracking-wider text-[10px] min-w-[120px] whitespace-nowrap bg-stone-900 border-r border-white/5">
                  {String(col || `Column ${idx + 1}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.length === 0 ? (
              <tr>
                <td colSpan={headerRow.length + 1} className="p-8 text-center text-xs text-white/40 italic">
                  No matching cell registries found in this sheet selection.
                </td>
              </tr>
            ) : (
              dataRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-white/[0.02] border-b border-white/5 odd:bg-white/[0.005] transition-colors">
                  <td className="p-2.5 text-center text-[10px] font-mono text-white/20 select-none border-r border-white/5 bg-stone-900/10">
                    {rIdx + 1}
                  </td>
                  {headerRow.map((_, cIdx) => (
                    <td key={cIdx} className="p-2.5 border-r border-white/5 max-w-sm truncate whitespace-nowrap font-mono text-[11px] text-slate-300">
                      {String(row[cIdx] !== undefined ? row[cIdx] : '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="p-2.5 bg-stone-900/40 border-t border-white/5 flex items-center justify-between text-[10px] text-white/40 font-mono tracking-wider shrink-0">
        <span>COLUMNS: {headerRow.length}</span>
        <span>TOTAL DATA ROWS: {dataRows.length}</span>
      </div>
    </div>
  );
}

// Helper to dynamically load script
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = (e) => reject(e);
    document.head.appendChild(script);
  });
}

interface PdfViewerProps {
  url: string;
  fileName: string;
  fileSize: number;
}

const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
const PDFJS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

function PdfViewer({ url, fileName, fileSize }: PdfViewerProps) {
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageCount, setPageCount] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  // Initialize and load PDF.js + File
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setPdfDoc(null);
    setCurrentPage(1);

    async function initPdf() {
      try {
        await loadScript(PDFJS_CDN);
        if (!active) return;

        let pdfjsLib = (window as any).pdfjsLib || (window as any)['pdfjs-dist/build/pdf'];
        
        // Wait and poll for the dynamic window properties registration
        if (!pdfjsLib) {
          for (let i = 0; i < 30; i++) {
            await new Promise(resolve => setTimeout(resolve, 100));
            pdfjsLib = (window as any).pdfjsLib || (window as any)['pdfjs-dist/build/pdf'];
            if (pdfjsLib) break;
          }
        }

        if (!pdfjsLib) {
          throw new Error('PDF.js assets could not load on the window context.');
        }

        pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;

        // Fetch PDF file proxy stream safely via getDocument
        const loadingTask = pdfjsLib.getDocument({ url });
        const docProxy = await loadingTask.promise;

        if (active) {
          setPdfDoc(docProxy);
          setPageCount(docProxy.numPages);
          setLoading(false);
        }
      } catch (err: any) {
        console.error('PDF.js dynamic init error:', err);
        if (active) {
          setError(
            err?.message || 
            'The secure PDF document parser is temporarily unreachable. Try downloading the file directly or check network authorization.'
          );
          setLoading(false);
        }
      }
    }

    initPdf();

    return () => {
      active = false;
    };
  }, [url]);

  // Handle Page Rendering
  useEffect(() => {
    if (!pdfDoc) return;
    let active = true;

    async function renderPage() {
      try {
        setRendering(true);
        const page = await pdfDoc.getPage(currentPage);
        if (!active || !canvasRef.current) return;

        // Cancel previous render if exist to avoid trace overlaps
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        // Obtain viewport coordinates with parameters
        const viewport = page.getViewport({ scale, rotation });
        
        // Match high-DPI retina rendering
        const dpr = window.devicePixelRatio || 1;
        canvas.width = viewport.width * dpr;
        canvas.height = viewport.height * dpr;
        canvas.style.width = '100%';
        canvas.style.height = 'auto';

        context.scale(dpr, dpr);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        if (active) {
          setRendering(false);
          renderTaskRef.current = null;
        }
      } catch (err: any) {
        if (err?.name === 'RenderingCancelledException' || err?.message?.includes('cancelled')) {
          // Normal Cancellation, suppress logs
          return;
        }
        console.error('Canvas draw phase error:', err);
        if (active) {
          setRendering(false);
        }
      }
    }

    renderPage();

    return () => {
      active = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [pdfDoc, currentPage, scale, rotation]);

  const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 2.5));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  const rotate = () => setRotation(prev => (prev + 90) % 360);

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const nextPage = () => {
    if (currentPage < pageCount) {
      setCurrentPage(prev => prev + 1);
    }
  };

  return (
    <div className="w-full flex flex-col md:flex-row h-[52vh] bg-stone-950 border border-white/10 rounded-2xl overflow-hidden text-slate-100 shadow-2xl relative">
      {/* Parameters Panel Left Side */}
      <div className="w-full md:w-1/3 bg-stone-900/40 p-5 border-b md:border-b-0 md:border-r border-white/5 flex flex-col justify-between space-y-4 shrink-0">
        <div className="space-y-4">
          <div className="inline-flex p-3 bg-rose-500/10 rounded-2xl text-rose-400">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div className="space-y-2">
            <h4 className="font-serif text-lg text-white font-light tracking-wide truncate max-w-xs">{fileName}</h4>
            <div className="flex flex-col gap-1 text-[10px] font-mono text-white/40 uppercase tracking-widest">
              <span>SIZE: {formatBytes(fileSize)}</span>
              <span>PAGES: {loading ? 'Reading document...' : `${currentPage} of ${pageCount}`}</span>
              <span>FORMAT: PDF (Dynamic Native View)</span>
              <span>ZOOM: {Math.round(scale * 100)}%</span>
            </div>
          </div>
          
          <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#22c55e] flex items-center gap-1.5">
              ● Native Container View Active
            </span>
            <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
              PDF.js has bypassed Chrome sandbox filters. You can read, scale, zoom, and rotate files comfortably inside this workspace.
            </p>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 font-serif text-[11px] font-semibold text-black rounded-xl text-center block transition-all shadow-lg shadow-amber-500/10 tracking-wider whitespace-nowrap active:scale-[0.99]"
          >
            Open in New Browser Tab
          </a>
          <a
            href={url}
            download={fileName}
            className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-sans text-[11px] text-slate-350 text-center block transition-all tracking-wider font-semibold hover:text-white"
          >
            Download Adobe PDF File
          </a>
        </div>
      </div>

      {/* Real-time Interactive Viewer Canvas viewport */}
      <div className="flex-1 bg-stone-950 flex flex-col h-full relative overflow-hidden">
        {/* Simple Viewer Top Action Bar */}
        {!loading && !error && (
          <div className="p-2.5 bg-stone-900 border-b border-white/10 flex items-center justify-between z-10 shrink-0 select-none">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevPage}
                disabled={currentPage <= 1 || rendering}
                className="p-1 px-2.5 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all text-xs font-semibold flex items-center gap-1"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <span className="text-[11px] font-mono px-2 text-white/60">
                Page {currentPage} of {pageCount}
              </span>
              <button
                type="button"
                onClick={nextPage}
                disabled={currentPage >= pageCount || rendering}
                className="p-1 px-2.5 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all text-xs font-semibold flex items-center gap-1"
                title="Next Page"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={zoomOut}
                disabled={scale <= 0.5}
                className="p-1.5 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 disabled:opacity-30 transition-all"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono w-10 text-center text-white/50">{Math.round(scale * 100)}%</span>
              <button
                type="button"
                onClick={zoomIn}
                disabled={scale >= 2.5}
                className="p-1.5 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 disabled:opacity-30 transition-all"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <div className="h-4 w-[1px] bg-white/10 mx-1" />
              <button
                type="button"
                onClick={rotate}
                className="p-1.5 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 transition-all"
                title="Rotate Clockwise"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto p-4 flex justify-center items-start relative bg-stone-900/30 no-scrollbar">
          {loading ? (
            <div className="m-auto flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-accent" />
              <p className="text-white/30 font-mono text-[10px] uppercase tracking-wider">Mounting Sandbox PDF Engine...</p>
            </div>
          ) : error ? (
            <div className="m-auto text-center space-y-3 max-w-sm p-6">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
              <h5 className="text-sm font-semibold text-rose-450 font-serif">Parsing Interrupted</h5>
              <p className="text-xs text-paragraph-gray leading-relaxed italic">{error}</p>
            </div>
          ) : (
            <div className="relative shadow-2xl rounded-lg overflow-hidden bg-white border border-white/5">
              {rendering && (
                <div className="absolute inset-0 bg-stone-950/20 backdrop-blur-[2px] flex items-center justify-center z-10 transition-all duration-200">
                  <div className="px-3 py-1.5 bg-black/80 rounded-full border border-white/10 text-[9px] font-mono uppercase tracking-widest text-amber-accent flex items-center gap-1.5 shadow-lg">
                    <RefreshCw className="w-3 h-3 animate-spin text-amber-accent" />
                    <span>Redrawing Canvas Grid...</span>
                  </div>
                </div>
              )}
              <canvas ref={canvasRef} className="block select-none" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FilesHub() {
  const { user } = useAuth();
  const { showToast: triggerGlobalToast } = useErrorUX();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('active');
  const [selectedFileForHistory, setSelectedFileForHistory] = useState<FileRecord | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  
  // Custom Multimedia Preview Overlay State Hooks
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);
  const [textFileContent, setTextFileContent] = useState<string>('');
  const [loadingTextContent, setLoadingTextContent] = useState<boolean>(false);
  const [resolvedPreviewUrl, setResolvedPreviewUrl] = useState<string>('');
  const [resolvingChunks, setResolvingChunks] = useState<boolean>(false);
  const [showMoreDropdown, setShowMoreDropdown] = useState<boolean>(false);
  const [imgZoom, setImgZoom] = useState<number>(1);
  const [imgRotation, setImgRotation] = useState<number>(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize and resolve cloud/database-saved chunks whenever previewing
  useEffect(() => {
    if (!previewFile) {
      setResolvedPreviewUrl('');
      setResolvingChunks(false);
      setShowMoreDropdown(false);
      setImgZoom(1);
      setImgRotation(0);
      return;
    }

    let active = true;
    async function resolveUrl() {
      if (previewFile && previewFile.hasChunks) {
        try {
          setResolvingChunks(true);
          // Try to fetch and merge all chunks from Firestore
          const blob = await fetchFileFromChunks(previewFile.id!, previewFile.mimeType);
          if (!active) return;
          const blobUrl = URL.createObjectURL(blob);
          setResolvedPreviewUrl(blobUrl);
          setResolvingChunks(false);
        } catch (err: any) {
          console.error("Failed to resolve chunks for preview:", err);
          if (active) {
            setResolvedPreviewUrl(previewFile!.downloadUrl);
            setResolvingChunks(false);
          }
        }
      } else {
        if (active) {
          setResolvedPreviewUrl(previewFile!.downloadUrl);
        }
      }
    }

    resolveUrl();
    return () => {
      active = false;
    };
  }, [previewFile]);

  // Storage Quota Bounds (2GB capacity limit)
  const MAX_STORAGE = 2 * 1024 * 1024 * 1024; // 2 GB
  const usedStorage = files.filter(f => f.status === 'active').reduce((acc, f) => acc + (f.fileSize || 0), 0);
  const remainingStorage = Math.max(0, MAX_STORAGE - usedStorage);
  const percentUsed = Math.min(100, (usedStorage / MAX_STORAGE) * 100);

  // Fetch text contents when previewing lightweight text archives
  useEffect(() => {
    if (!previewFile || !resolvedPreviewUrl) {
      setTextFileContent('');
      return;
    }
    const mime = (previewFile.mimeType || '').toLowerCase();
    const name = (previewFile.fileName || '').toLowerCase();
    const isTextReadable = mime.startsWith('text/') || mime.includes('json') || mime.includes('xml') || mime.includes('csv') || name.endsWith('.json') || name.endsWith('.txt') || name.endsWith('.csv') || name.endsWith('.xml') || name.endsWith('.rtf');
    
    if (isTextReadable && previewFile.fileSize < 2 * 1024 * 1024) {
      setLoadingTextContent(true);
      fetch(resolvedPreviewUrl)
        .then(res => res.text())
        .then(text => {
          setTextFileContent(text);
          setLoadingTextContent(false);
        })
        .catch(err => {
          console.error("Text content download error:", err);
          setTextFileContent('Failed to fetch readable text stream.');
          setLoadingTextContent(false);
        });
    }
  }, [previewFile, resolvedPreviewUrl]);

  // Trigger auto-dismissing toast notifications via global ErrorUX
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    triggerGlobalToast(text, type === 'error' ? 'error' : 'success');
  };

  // Real-time listener for the user's files collection in Firestore
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    let uidFiles: FileRecord[] = [];
    let emailFiles: FileRecord[] = [];

    const mergeAndSet = () => {
      const mergedMap = new Map<string, FileRecord>();
      uidFiles.forEach(f => { if (f.id) mergedMap.set(f.id, f); });
      emailFiles.forEach(f => { if (f.id) mergedMap.set(f.id, f); });
      const sorted = Array.from(mergedMap.values());
      sorted.sort((a, b) => {
        const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt?.seconds * 1000 || 0);
        const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt?.seconds * 1000 || 0);
        return bTime - aTime;
      });
      setFiles(sorted);
      setLoading(false);

      if (selectedFileForHistory) {
        const currentFile = sorted.find(f => f.id === selectedFileForHistory.id);
        if (currentFile) {
          setSelectedFileForHistory(currentFile);
        }
      }
    };

    // 1. Subscribe by UID
    const qUid = query(
      collection(db, 'files'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubUid = onSnapshot(qUid, (snapshot) => {
      uidFiles = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
        } as FileRecord;
      });
      mergeAndSet();
    }, (err) => {
      console.warn('UID files indices index building fallback:', err);
      const fbUid = query(
        collection(db, 'files'),
        where('userId', '==', user.uid)
      );
      onSnapshot(fbUid, (snapshot) => {
        uidFiles = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
          } as FileRecord;
        });
        mergeAndSet();
      });
    });

    // 2. Subscribe by Email
    let unsubEmail = () => {};
    if (user.email) {
      const qEmail = query(
        collection(db, 'files'),
        where('userEmail', '==', user.email),
        orderBy('createdAt', 'desc')
      );

      unsubEmail = onSnapshot(qEmail, (snapshot) => {
        emailFiles = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
          } as FileRecord;
        });
        mergeAndSet();
      }, (err) => {
        console.warn('Email files query fallback:', err);
        const fbEmail = query(
          collection(db, 'files'),
          where('userEmail', '==', user.email)
        );
        onSnapshot(fbEmail, (sn) => {
          emailFiles = sn.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
              updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
            } as FileRecord;
          });
          mergeAndSet();
        });
      });
    }

    return () => {
      unsubUid();
      unsubEmail();
    };
  }, [user, selectedFileForHistory]);

  // Handle manual selection upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;
    await processAndUploadFile(selectedFiles[0]);
  };

  // Process the file, validate bounds, and initiate upload
  const processAndUploadFile = async (file: File) => {
    if (!user) {
      showToast('You must be logged in to upload assets.', 'error');
      return;
    }

    // Limit size dynamically checks remaining secure storage quota remaining (Max 2GB capacity)
    if (file.size > MAX_STORAGE) {
      showToast('File size exceeds the absolute 2GB maximum limit.', 'error');
      return;
    }

    if (usedStorage + file.size > MAX_STORAGE) {
      showToast(`Upload blocked. You have used ${formatBytes(usedStorage)} of your 2GB secure vault storage capacity. Please delete other files.`, 'error');
      return;
    }

    try {
      setUploading(true);
      setUploadProgressMsg(`Syncing file content for "${file.name}"...`);
      const fileRecord = await uploadUserFile(file, user.uid);
      showToast(`Successfully uploaded & synced: ${fileRecord.fileName}!`);
    } catch (err: any) {
      console.error('Upload Error:', err);
      showToast(err?.message || 'Failed to sync the uploaded file.', 'error');
    } finally {
      setUploading(false);
      setUploadProgressMsg('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Drag and Drop event handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processAndUploadFile(e.dataTransfer.files[0]);
    }
  };

  // Handles download logic + analytics logging
  const handleDownload = async (fileRecord: FileRecord) => {
    if (!fileRecord.id) return;
    try {
      // 1. Fetch file record from Firestore /files/{fileId} to get storagePath
      const docRef = doc(db, 'files', fileRecord.id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        showToast('File record not found in database.', 'error');
        return;
      }
      
      const fileData = docSnap.data();
      let downloadUrl = fileData.downloadUrl;
      const storagePath = fileData.storagePath;

      if (fileData.hasChunks) {
        try {
          const blob = await fetchFileFromChunks(fileRecord.id, fileRecord.mimeType || 'application/octet-stream');
          downloadUrl = URL.createObjectURL(blob);
        } catch (chunksErr) {
          console.error('Failed to parse from database chunks:', chunksErr);
        }
      } else if (storagePath && !downloadUrl.startsWith('/api/')) {
        try {
          const { ref: sRef, getDownloadURL } = await import('firebase/storage');
          const { storage } = await import('../lib/firebase');
          const storageReference = sRef(storage, storagePath);
          downloadUrl = await getDownloadURL(storageReference);
        } catch (storageErr) {
          console.warn('Fallback Firebase storage url fetch failed:', storageErr);
        }
      }

      if (!downloadUrl) {
        showToast('Download URL details missing assistance.', 'error');
        return;
      }

      // 3. Create a clean click anchor to trigger safe browser-level downloads
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.target = '_blank';
      link.download = fileRecord.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Log the download event in Firestore for precise audit trail sync
      await logFileDownload(fileRecord.id, fileRecord.history || [], fileRecord.downloadCount || 0);
      showToast(`Initiated download for "${fileRecord.fileName}"`);
    } catch (err: any) {
      console.error('Error fetching/downloading asset:', err);
      showToast('Failed to retrieve file download URL.', 'error');
    }
  };

  // Handles file deletion with archive preservation logic
  const handleDelete = async (fileRecord: FileRecord) => {
    if (!fileRecord.id) return;
    if (!window.confirm(`Are you sure you want to delete and un-sync "${fileRecord.fileName}"? This will physically purge the object from secure storage while archiving its history records.`)) {
      return;
    }

    try {
      await deleteUserFile(fileRecord.id, fileRecord.storagePath, fileRecord.history || []);
      showToast(`Successfully deleted & un-synced "${fileRecord.fileName}"`);
      if (selectedFileForHistory?.id === fileRecord.id) {
        setSelectedFileForHistory(null);
      }
    } catch (err: any) {
      showToast('Failed to complete file un-sync and archive action.', 'error');
    }
  };

  // Get File Icons corresponding to MimeType
  const getFileIcon = (mimeType: string) => {
    const lMime = mimeType.toLowerCase();
    if (lMime.startsWith('image/')) {
      return <ImageIcon className="w-6 h-6 text-amber-accent" />;
    } else if (lMime.includes('pdf')) {
      return <FileText className="w-6 h-6 text-rose-400" />;
    } else if (lMime.startsWith('video/')) {
      return <VideoIcon className="w-6 h-6 text-fuchsia-400" />;
    } else if (lMime.startsWith('audio/')) {
      return <AudioIcon className="w-6 h-6 text-emerald-400" />;
    } else if (lMime.includes('sheet') || lMime.includes('excel') || lMime.includes('csv')) {
      return <FileSpreadsheet className="w-6 h-6 text-teal-400" />;
    } else if (lMime.includes('word') || lMime.includes('officedocument.word') || lMime.includes('msword')) {
      return <FileText className="w-6 h-6 text-sky-400 font-bold" />;
    } else if (lMime.includes('presentation') || lMime.includes('powerpoint')) {
      return <FileText className="w-6 h-6 text-orange-400 font-bold" />;
    } else if (lMime.includes('text/') || lMime.includes('json') || lMime.includes('xml')) {
      return <FileText className="w-6 h-6 text-sky-400" />;
    }
    return <File className="w-6 h-6 text-gray-400" />;
  };

  // Filter files based on user controls
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.fileName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (file.mimeType && file.mimeType.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = selectedStatus === 'all' || file.status === selectedStatus;
    
    let matchesType = true;
    if (selectedType !== 'all') {
      const lMime = (file.mimeType || '').toLowerCase();
      const name = (file.fileName || '').toLowerCase();
      
      if (selectedType === 'images') {
        matchesType = lMime.startsWith('image/');
      } else if (selectedType === 'documents') {
        matchesType = lMime.includes('pdf') || lMime.includes('text/') || lMime.includes('json') || lMime.includes('xml');
      } else if (selectedType === 'office') {
        matchesType = lMime.includes('word') || lMime.includes('officedocument') || lMime.includes('presentation') || lMime.includes('powerpoint') || lMime.includes('msword') || name.endsWith('.docx') || name.endsWith('.doc') || name.endsWith('.pptx') || name.endsWith('.ppt');
      } else if (selectedType === 'spreadsheets') {
        matchesType = lMime.includes('sheet') || lMime.includes('excel') || lMime.includes('csv') || name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv');
      } else if (selectedType === 'videos') {
        matchesType = lMime.startsWith('video/') || name.endsWith('.mp4') || name.endsWith('.mov') || name.endsWith('.avi') || name.endsWith('.webm') || name.endsWith('.mkv');
      } else if (selectedType === 'audio') {
        matchesType = lMime.startsWith('audio/') || name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.aac') || name.endsWith('.ogg') || name.endsWith('.m4a');
      } else if (selectedType === 'others') {
        const isDoc = lMime.includes('pdf') || lMime.includes('text/') || lMime.includes('json') || lMime.includes('xml');
        const isOffice = lMime.includes('word') || lMime.includes('officedocument') || lMime.includes('presentation') || lMime.includes('powerpoint') || lMime.includes('msword') || name.endsWith('.docx') || name.endsWith('.doc') || name.endsWith('.pptx') || name.endsWith('.ppt');
        const isSheet = lMime.includes('sheet') || lMime.includes('excel') || lMime.includes('csv') || name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv');
        const isVideo = lMime.startsWith('video/') || name.endsWith('.mp4') || name.endsWith('.mov') || name.endsWith('.webm');
        const isAudio = lMime.startsWith('audio/') || name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.m4a');
        matchesType = !lMime.startsWith('image/') && !isDoc && !isOffice && !isSheet && !isVideo && !isAudio;
      }
    }

    return matchesSearch && matchesStatus && matchesType;
  });

  // Calculate quick metrics
  const activeFilesCount = files.filter(f => f.status === 'active').length;
  const deletedFilesCount = files.filter(f => f.status === 'deleted').length;
  const totalStorageSize = files.filter(f => f.status === 'active').reduce((acc, f) => acc + (f.fileSize || 0), 0);

  // Unified Chronological Activity Stream from all uploaded files
  const combinedActivityLogs = files.flatMap(file => 
    (file.history || []).map(evt => ({
      fileName: file.fileName,
      fileId: file.id,
      status: file.status,
      ...evt,
      timestampDate: new Date(evt.timestamp)
    }))
  ).sort((a, b) => b.timestampDate.getTime() - a.timestampDate.getTime());

  return (
    <div className="space-y-10 min-h-screen">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 border-b border-white/5 pb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5 text-left">
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2.5 py-0.5 bg-amber-accent/10 border border-amber-accent/20 rounded-full text-amber-accent font-black uppercase tracking-widest">
                Storage Synced
              </span>
              <span className="text-[10px] px-2.5 py-0.5 bg-white/5 border border-white/10 rounded-full text-white/50 font-semibold uppercase tracking-widest">
                Zero-Trust
              </span>
            </div>
            <h1 className="font-serif text-3xl md:text-4xl font-light text-white tracking-tight">
              Culinary Vault & <span className="italic text-amber-accent font-light">Asset Hub</span>
            </h1>
            <p className="text-xs text-gray-500 font-light max-w-3xl leading-relaxed">
              Store, fetch, and synchronize critical kitchen documents, gourmet imagery, raw PDF recipes, and grocery templates directly in your dedicated secure storage environment. Every download, upload, and deletion is recorded securely with synced transaction trail logs.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3.5 bg-amber-accent text-black hover:bg-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-amber-accent/10 active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-black shrink-0 stroke-[3]" />
              Sync New Asset
            </button>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden" 
            />
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[24px] flex items-center gap-4.5 text-left">
          <div className="p-3 bg-amber-accent/10 rounded-2xl text-amber-accent shrink-0">
            <Database className="w-5 h-5 text-amber-accent" />
          </div>
          <div className="space-y-1">
            <p className="text-[9px] uppercase font-black tracking-widest text-gray-500">Live Active Synced</p>
            <p className="text-2xl font-serif text-white font-light">{activeFilesCount} <span className="text-xs text-gray-500 font-sans">Files</span></p>
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[24px] flex items-center gap-4.5 text-left">
          <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-400 shrink-0">
            <Clock className="w-5 h-5 text-rose-400" />
          </div>
          <div className="space-y-1">
            <p className="text-[9px] uppercase font-black tracking-widest text-gray-500">History Archives</p>
            <p className="text-2xl font-serif text-white font-light">{deletedFilesCount} <span className="text-xs text-gray-500 font-sans">Purged</span></p>
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[24px] flex items-center gap-4.5 text-left">
          <div className="p-3 bg-teal-500/10 rounded-2xl text-teal-400 shrink-0">
            <Activity className="w-5 h-5 text-teal-400" />
          </div>
          <div className="space-y-1">
            <p className="text-[9px] uppercase font-black tracking-widest text-gray-500">Active Disk Footprint</p>
            <p className="text-2xl font-serif text-white font-light">{formatBytes(usedStorage)}</p>
          </div>
        </div>
      </div>

      {/* Smart Storage Capacity Meter */}
      <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[28px] text-left space-y-4 relative overflow-hidden">
        <div className="absolute top-1/2 right-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-teal-400/[0.01] blur-[80px] rounded-full pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-teal-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Vault Storage Space Allocator</h3>
            </div>
            <p className="text-xs text-gray-500 font-light">
              Your account is provisioned with <strong className="text-white">2.00 GB</strong> of secure cloud-isolated storage for multimedia culinary assets.
            </p>
          </div>
          <div className="text-left sm:text-right space-y-0.5">
            <p className="text-[10px] uppercase font-black tracking-widest text-gray-500">Storage Usage Report</p>
            <p className="text-lg font-serif font-light text-white">
              {formatBytes(usedStorage)} <span className="text-xs font-sans text-gray-500">/ 2.00 GB used</span>
            </p>
          </div>
        </div>

        {/* Progress Bar Track */}
        <div className="space-y-2">
          <div className="h-2.5 w-full bg-black border border-white/5 rounded-full overflow-hidden p-0.5 flex">
            <motion.div 
              className={cn(
                "h-full rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(20,184,166,0.3)]",
                percentUsed > 85 
                  ? "bg-rose-500 shadow-[0_0_12px_rgba(239,68,68,0.4)]" 
                  : percentUsed > 60 
                  ? "bg-amber-accent shadow-[0_0_12px_rgba(245,158,11,0.4)]" 
                  : "bg-teal-400"
              )}
              initial={{ width: '0%' }}
              animate={{ width: `${percentUsed}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono">
            <span>{percentUsed.toFixed(1)}% Capacity Occupied</span>
            <span className="text-teal-400 font-bold">{formatBytes(remainingStorage)} Available Remaining</span>
          </div>
        </div>
      </div>

      {/* Interactive Drag & Drop Vault Zone */}
      <div 
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative border-2 border-dashed rounded-[32px] p-10 md:p-14 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-4 group overflow-hidden bg-white/[0.01]",
          isDragActive 
            ? "border-amber-accent bg-amber-accent/[0.03] scale-[1.01] shadow-2xl shadow-amber-accent/5 animate-pulse" 
            : "border-white/10 hover:border-amber-accent/30 hover:bg-white/[0.02]"
        )}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-amber-accent/[0.02] blur-[80px] rounded-full pointer-events-none group-hover:bg-amber-accent/[0.04] transition-all" />

        {uploading ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 rounded-full border border-dashed border-amber-accent flex items-center justify-center"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-amber-accent animate-spin" />
              </div>
            </div>
            <div className="space-y-1 text-center">
              <h4 className="font-serif text-lg font-light text-white italic">Transmitting culinary package...</h4>
              <p className="text-xs text-amber-accent font-mono">{uploadProgressMsg}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 bg-white/[0.03] rounded-2xl group-hover:scale-110 group-hover:bg-amber-accent/15 group-hover:text-black border border-white/5 transition-all text-gray-400">
              <UploadCloud className="w-7 h-7 text-amber-accent" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-serif text-xl font-light text-white group-hover:text-amber-accent transition-colors">
                Drag &amp; Drop Gourmet Assets Here
              </h3>
              <p className="text-xs text-gray-500 font-light max-w-md mx-auto">
                Or click to browse files from your disk. Supports images (PNG, JPG, WEBP), recipe PDFs, grocery guidelines, audio cooking notes, video guides, and nutrition docs up to 2GB.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[9px] font-bold font-mono tracking-widest text-amber-accent bg-amber-accent/10 border border-amber-accent/20 px-3.5 py-1.5 rounded-full uppercase leading-none">
              <Sparkles className="w-3 h-3 text-amber-accent fill-amber-accent animate-pulse" />
              Secure Bucket Connected
            </div>
          </>
        )}
      </div>

      {/* Main Asset View & Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
        {/* Files Grid Column (Takes 2 Columns on large screens) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Controls Bar */}
          <div className="bg-white/[0.02] border border-white/5 p-4 rounded-[24px] flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Search */}
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search synced files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-black border border-white/5 rounded-xl text-xs text-white focus:outline-none focus:border-amber-accent/60 transition-colors"
              />
            </div>

            {/* Type/Status Classification Controls */}
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto no-scrollbar justify-end">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 bg-black border border-white/5 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-amber-accent/60 transition-colors"
                title="Filter by File Type"
              >
                <option value="all">All Web Formats</option>
                <option value="images">Images Only</option>
                <option value="documents">PDFs &amp; Text Docs</option>
                <option value="office">Office Docs (Word/PPT)</option>
                <option value="spreadsheets">Spreadsheets</option>
                <option value="videos">Videos</option>
                <option value="audio">Audio Tracks</option>
                <option value="others">Other Assets</option>
              </select>

              <div className="flex items-center bg-black/40 border border-white/5 p-1 rounded-xl">
                <button
                  onClick={() => setSelectedStatus('active')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors",
                    selectedStatus === 'active' 
                      ? "bg-amber-accent text-black" 
                      : "text-gray-400 hover:text-white"
                  )}
                >
                  Active
                </button>
                <button
                  onClick={() => setSelectedStatus('deleted')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors",
                    selectedStatus === 'deleted' 
                      ? "bg-rose-500/20 text-rose-400" 
                      : "text-gray-400 hover:text-white"
                  )}
                >
                  Deleted Archives
                </button>
              </div>
            </div>
          </div>

          {/* Files List Display */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <RefreshCw className="w-8 h-8 text-amber-accent animate-spin" />
              <p className="text-xs text-gray-500 font-mono">Syncing file index from metadata registries...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="py-20 border border-white/5 rounded-[28px] bg-white/[0.01] flex flex-col items-center justify-center space-y-4 text-center px-4">
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-full text-gray-500">
                <File className="w-8 h-8 text-gray-600" />
              </div>
              <div className="space-y-1">
                <h4 className="font-serif text-lg text-white font-light">No culinary assets found</h4>
                <p className="text-xs text-gray-500 font-light max-w-sm">
                  {searchQuery 
                    ? `No records matching "${searchQuery}" in your requested filter states.` 
                    : `No file records found in the user collection. Try dragging your cooking guides or images into the dropzone above.`}
                </p>
              </div>
              {selectedStatus === 'deleted' && (
                <button 
                  onClick={() => setSelectedStatus('active')} 
                  className="px-4 py-2 bg-white/5 border border-white/5 rounded-xl text-[10px] font-semibold tracking-wider text-amber-accent hover:border-amber-accent/25 uppercase transition-colors"
                >
                  View Active Files
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <AnimatePresence mode="popLayout">
                {filteredFiles.map((file) => (
                  <motion.div
                    layout
                    key={file.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.25 }}
                    className={cn(
                      "group bg-white/[0.02] border p-5 rounded-[24px] space-y-4 flex flex-col justify-between transition-all hover:translate-y-[-2px] select-none",
                      file.status === 'deleted' 
                        ? "border-rose-500/10 opacity-70 bg-rose-500/[0.01]" 
                        : "border-white/5 hover:border-white/10 hover:bg-white/[0.03]"
                    )}
                  >
                    {/* Header: Icon type & Details & Status Badge */}
                    <div className="flex items-start gap-3 justify-between">
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className={cn(
                          "p-3 rounded-2xl border shrink-0",
                          file.status === 'deleted' 
                            ? "bg-rose-500/5 border-rose-500/10 text-rose-400" 
                            : "bg-white/[0.03] border-white/5 group-hover:border-amber-accent/20 group-hover:bg-amber-accent/10 text-white transition-colors"
                        )}>
                          {getFileIcon(file.mimeType)}
                        </div>
                        <div className="space-y-1 min-w-0 text-left">
                          <h4 className="font-sans text-xs font-bold text-white tracking-wide truncate group-hover:text-amber-accent transition-colors" title={file.fileName}>
                            {file.fileName}
                          </h4>
                          <p className="text-[10px] text-gray-500 font-mono">
                            {formatBytes(file.fileSize)} • {file.mimeType.split('/')[1] || file.mimeType}
                          </p>
                        </div>
                      </div>

                      {/* Delete Status Indicator */}
                      {file.status === 'deleted' ? (
                        <span className="text-[7px] font-black uppercase tracking-wider px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-md">
                          Purged
                        </span>
                      ) : (
                        <span className="text-[7px] font-black uppercase tracking-wider px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md">
                          Live
                        </span>
                      )}
                    </div>

                    {/* Metadata summary: timestamp registry */}
                    <div className="border-t border-white/5 pt-3 flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <Clock className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                        <span>
                          {file.createdAt instanceof Date 
                            ? file.createdAt.toLocaleDateString() 
                            : 'Unknown time'}
                        </span>
                      </div>

                      <div className="text-gray-500 flex items-center gap-1">
                        <span className="font-bold text-gray-300">{file.downloadCount || 0}</span>
                        <span>Fetches</span>
                      </div>
                    </div>

                    {/* Footer Actions: download and delete synced */}
                    <div className="grid grid-cols-2 gap-2 pt-1 mt-auto text-[9px] font-black uppercase tracking-widest">
                      <button
                        onClick={() => setSelectedFileForHistory(file)}
                        className="py-2.5 bg-white/5 hover:bg-white/10 hover:text-white border border-white/5 rounded-xl text-gray-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        title="View Event Audit Logs"
                      >
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        Audit
                      </button>
                      
                      {file.status === 'active' ? (
                        <button
                          onClick={() => setPreviewFile(file)}
                          className="py-2.5 bg-amber-accent/15 hover:bg-amber-accent hover:text-black border border-amber-accent/10 border-white/5 text-amber-accent rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          title="Open Secure Inline Viewer"
                        >
                          <Eye className="w-3.5 h-3.5 shrink-0" />
                          Open
                        </button>
                      ) : (
                        <div className="py-2.5 bg-white/[0.01] border border-white/5 rounded-xl text-gray-600 flex items-center justify-center gap-1.5 select-none leading-none">
                          Archived
                        </div>
                      )}

                      {file.status === 'active' && (
                        <button
                          onClick={() => handleDownload(file)}
                          className="col-span-1 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-white transition-all flex items-center justify-center gap-1 cursor-pointer"
                          title="Download Culinary Asset File"
                        >
                          <Download className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                          <span className="text-[8px]">Save</span>
                        </button>
                      )}
                      
                      {file.status === 'active' && (
                        <button
                          onClick={() => handleDelete(file)}
                          className="col-span-1 py-2 bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/20 text-rose-400 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                          title="Delete File"
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-[8px]">Purge</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Audit Activity Stream Column (Takes 1 Column) */}
        <div className="space-y-6">
          <div className="bg-white/[0.02] border border-white/5 rounded-[32px] p-6 space-y-5">
            <h3 className="font-serif text-xl font-light text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-accent" />
              Vault Activity Stream
            </h3>
            <p className="text-[11px] text-gray-500 leading-relaxed font-light">
              This feed is a live multi-user transaction ledger mapping actual operations triggered by uploads, downloads, and purge requests on /files registries.
            </p>

            <div className="border-t border-white/5 pt-4 space-y-4 max-h-[480px] overflow-y-auto no-scrollbar">
              {loading ? (
                <div className="py-10 text-center text-gray-600 font-mono text-xs">
                  Awaiting activity ledger logs...
                </div>
              ) : combinedActivityLogs.length === 0 ? (
                <div className="py-10 text-center text-gray-600 text-[11px] font-light italic">
                  No activity captured on storage directories yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {combinedActivityLogs.slice(0, 15).map((log, idx) => (
                    <div key={idx} className="flex gap-3 text-left">
                      <div className="flex flex-col items-center shrink-0">
                        <div className={cn(
                          "w-2.5 h-2.5 rounded-full mt-1.5 border",
                          log.action === 'upload' 
                            ? "bg-amber-accent border-amber-accent/30 shadow-[0_0_8px_rgba(245,158,11,0.4)]" 
                            : log.action === 'download' 
                            ? "bg-teal-400 border-teal-400/30" 
                            : "bg-rose-500 border-rose-500/30"
                        )} />
                        {idx !== combinedActivityLogs.slice(0, 15).length - 1 && (
                          <div className="w-0.5 bg-white/5 grow mt-1 min-h-[20px]" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn(
                            "text-[8px] px-1.5 py-0.5 rounded uppercase font-black tracking-widest text-[8px] leading-none",
                            log.action === 'upload' 
                              ? "bg-amber-accent/15 text-amber-accent" 
                              : log.action === 'download' 
                              ? "bg-teal-500/10 text-teal-400" 
                              : "bg-rose-500/10 text-rose-400"
                          )}>
                            {log.action}
                          </span>
                          <span className="text-[9px] text-gray-500 font-mono">
                            {log.timestampDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-300 font-light leading-relaxed">
                          {log.action === 'upload' ? 'Uploaded' : log.action === 'download' ? 'Fetched' : 'Permanently Purged'}{' '}
                          <span className="font-semibold text-white">"{log.fileName}"</span>{' '}
                          {log.action === 'delete' && 'archive folder metadata.'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* File Detail Audit History Detail Modal overlay */}
      <AnimatePresence>
        {selectedFileForHistory && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedFileForHistory(null)}
              className="fixed inset-0 bg-black z-50 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed inset-x-4 top-[10%] max-w-lg mx-auto z-50 bg-coal border border-white/10 rounded-[32px] p-6 md:p-8 shadow-2xl text-left"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-amber-accent font-mono">Audit Records Event Ledger</span>
                  <h3 className="font-serif text-xl font-light text-white flex items-center gap-2">
                    {getFileIcon(selectedFileForHistory.mimeType)}
                    {selectedFileForHistory.fileName}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedFileForHistory(null)}
                  className="p-2 bg-white/5 border border-white/5 rounded-full text-white/50 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Asset info */}
              <div className="grid grid-cols-2 gap-4 bg-white/[0.01] border border-white/5 rounded-2xl p-4 mb-6 text-xs text-gray-400">
                <div>
                  <p className="text-gray-500 text-[10px] font-mono uppercase tracking-wider">File Size</p>
                  <p className="font-medium text-white">{formatBytes(selectedFileForHistory.fileSize)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px] font-mono uppercase tracking-wider">Content Type</p>
                  <p className="font-medium text-white select-all">{selectedFileForHistory.mimeType}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500 text-[10px] font-mono uppercase tracking-wider">Secure Storage Path</p>
                  <p className="font-mono text-[10px] text-amber-accent/80 select-all break-all">{selectedFileForHistory.storagePath}</p>
                </div>
              </div>

              {/* History events list */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Chronological Event Logs</h4>
                <div className="space-y-3.5 max-h-52 overflow-y-auto pr-2 no-scrollbar">
                  {(selectedFileForHistory.history || []).map((evt, idx) => (
                    <div key={idx} className="flex gap-3 bg-white/[0.02] border border-white/5 rounded-xl p-3 text-xs">
                      <div className="shrink-0 flex items-center justify-center p-1.5 rounded-lg bg-black/40 border border-white/5">
                        <Clock className="w-3.5 h-3.5 text-amber-accent" />
                      </div>
                      <div className="space-y-1 flex-1 text-left">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-200 uppercase text-[9px] tracking-wide bg-amber-accent/15 text-amber-accent px-1.5 py-0.5 rounded">
                            {evt.action}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {new Date(evt.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-gray-400 leading-relaxed font-light">{evt.details}</p>
                      </div>
                    </div>
                  ))}
                  {(!selectedFileForHistory.history || selectedFileForHistory.history.length === 0) && (
                    <p className="text-xs text-gray-500 italic">No events reported for this file container.</p>
                  )}
                </div>
              </div>

              {/* Footer action */}
              <div className="border-t border-white/5 pt-5 mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedFileForHistory(null)}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs uppercase tracking-wider font-extrabold text-white transition-colors cursor-pointer"
                >
                  Close Audit
                </button>
                {selectedFileForHistory.status === 'active' && (
                  <button
                    onClick={() => {
                      setSelectedFileForHistory(null);
                      handleDownload(selectedFileForHistory);
                    }}
                    className="px-5 py-2.5 bg-amber-accent text-black hover:bg-white rounded-xl text-xs uppercase tracking-wider font-black transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Fetch File
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Secure Multimedia File Viewer Modal Overlay (FULL DEVICE SCREEN VIEWPORT) */}
      <AnimatePresence>
        {previewFile && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed inset-0 bg-stone-950 z-[100] flex flex-col focus:outline-none"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setPreviewFile(null);
            }}
          >
            {/* Full-Screen Top Banner */}
            <header className="h-16 shrink-0 bg-stone-900 border-b border-white/5 px-4 md:px-8 flex items-center justify-between select-none">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-2.5 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-all flex items-center justify-center cursor-pointer font-extrabold"
                  title="Back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/5 border border-white/10 rounded-xl text-amber-accent hidden sm:block">
                    {getFileIcon(previewFile.mimeType)}
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm md:text-base font-medium text-white truncate max-w-xs md:max-w-md select-text" title={previewFile.fileName}>
                      {previewFile.fileName}
                    </h3>
                    <p className="text-[10px] text-gray-400 font-mono">
                      {formatBytes(previewFile.fileSize)} • {previewFile.mimeType}
                    </p>
                  </div>
                </div>
              </div>

              {/* Top Banner Options Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowMoreDropdown(!showMoreDropdown)}
                  className="p-2.5 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-all flex items-center justify-center cursor-pointer"
                  title="More options"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {showMoreDropdown && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowMoreDropdown(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-stone-900 border border-white/10 rounded-2xl shadow-2xl p-2 z-40 text-left space-y-1">
                      <button
                        onClick={() => {
                          setShowMoreDropdown(false);
                          handleDownload(previewFile);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl text-gray-300 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                      >
                        <Download className="w-4 h-4 text-emerald-400" />
                        <span>Download / Save Offline</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowMoreDropdown(false);
                          if (resolvedPreviewUrl) {
                            navigator.clipboard.writeText(resolvedPreviewUrl);
                            showToast("Blob dynamic sequence link copied!");
                          } else {
                            navigator.clipboard.writeText(previewFile.downloadUrl);
                            showToast("Token link copied to clipboard!");
                          }
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl text-gray-300 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                      >
                        <Copy className="w-4 h-4 text-amber-accent" />
                        <span>Copy Dynamic URL</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowMoreDropdown(false);
                          setSelectedFileForHistory(previewFile);
                          setPreviewFile(null);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl text-gray-300 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                      >
                        <Clock className="w-4 h-4 text-sky-455" />
                        <span>View Audit Ledgers</span>
                      </button>

                      <div className="h-[1px] bg-white/5 my-1" />

                      <button
                        onClick={() => {
                          setShowMoreDropdown(false);
                          setPreviewFile(null);
                          handleDelete(previewFile);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl text-rose-450 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 text-rose-500" />
                        <span>Purge from Cloud Vault</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </header>

            {/* Viewer Content Frame */}
            <main className="flex-1 overflow-auto flex items-center justify-center p-4 md:p-8 bg-stone-950/40 relative min-h-0 select-none">
              {resolvingChunks ? (
                <div className="flex flex-col items-center justify-center space-y-4 text-center">
                  <RefreshCw className="w-10 h-10 animate-spin text-amber-accent" />
                  <h4 className="font-serif text-lg font-light text-white">Reassembling Gourmet Document Stream...</h4>
                  <p className="text-xs text-gray-400 font-mono uppercase tracking-wider">
                    Caching {formatBytes(previewFile.fileSize)} payload fragments
                  </p>
                </div>
              ) : !resolvedPreviewUrl ? (
                <div className="flex flex-col items-center justify-center space-y-4 text-center">
                  <RefreshCw className="w-10 h-10 animate-spin text-zinc-400" />
                  <h4 className="font-serif text-lg font-light text-white">Resolving Content Payload...</h4>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center select-text min-h-0 min-w-0">
                  {(() => {
                    const mime = (previewFile.mimeType || '').toLowerCase();
                    const name = (previewFile.fileName || '').toLowerCase();

                    // 1. IMAGE CHANNELS
                    const isImage = mime.startsWith('image/') || /\.(jpe?g|png|gif|webp|svg|tiff?|bmp|raw)$/i.test(name);
                    if (isImage) {
                      return (
                        <div className="relative w-full h-full flex flex-col items-center justify-center min-h-0 min-w-0">
                          {/* Image container with hidden overflow so zooms don't break page layouts */}
                          <div className="flex-1 w-full flex items-center justify-center overflow-hidden relative p-4">
                            <motion.img
                              src={resolvedPreviewUrl}
                              alt={previewFile.fileName}
                              style={{
                                transform: `scale(${imgZoom}) rotate(${imgRotation}deg)`,
                                transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                              }}
                              className="max-h-[calc(100vh-12rem)] max-w-full rounded-2xl object-contain mx-auto shadow-2xl border border-white/5 select-none"
                              referrerPolicy="no-referrer"
                            />
                          </div>

                          {/* Floating bottom premium controller action panel for premium preview navigation */}
                          <div className="bg-stone-900 border border-white/10 p-2.5 px-5 rounded-full flex items-center gap-6 shadow-2xl shrink-0 select-none mb-4 z-10">
                            {/* Zoom Out Button */}
                            <button
                              type="button"
                              onClick={() => setImgZoom(prev => Math.max(0.25, prev - 0.25))}
                              className="p-2 rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                              title="Zoom Out"
                            >
                              <ZoomOut className="w-4 h-4" />
                            </button>

                            {/* Scale Indicator & Reset trigger */}
                            <button
                              type="button"
                              onClick={() => {
                                setImgZoom(1);
                                setImgRotation(0);
                              }}
                              className="text-[10px] uppercase font-mono font-black text-amber-accent tracking-widest px-1 hover:underline cursor-pointer"
                              title="Reset Settings"
                            >
                              {Math.round(imgZoom * 100)}%
                            </button>

                            {/* Zoom In Button */}
                            <button
                              type="button"
                              onClick={() => setImgZoom(prev => Math.min(4, prev + 0.25))}
                              className="p-2 rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                              title="Zoom In"
                            >
                              <ZoomIn className="w-4 h-4" />
                            </button>

                            <div className="w-[1px] h-4 bg-white/10" />

                            {/* Rotate Button */}
                            <button
                              type="button"
                              onClick={() => setImgRotation(prev => (prev + 90) % 360)}
                              className="p-2 rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                              title="Rotate Right"
                            >
                              <RotateCw className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    }

                    // 2. VIDEO CHANNELS
                    const isVideo = mime.startsWith('video/') || /\.(mp4|mov|avi|wmv|mkv|webm|flv|mpe?g)$/i.test(name);
                    if (isVideo) {
                      return (
                        <div className="w-full max-h-full flex items-center justify-center">
                          <video
                            src={resolvedPreviewUrl}
                            controls
                            autoPlay
                            className="w-full max-h-[calc(100vh-10rem)] rounded-2xl bg-black shadow-2xl border border-white/5"
                          />
                        </div>
                      );
                    }

                    // 3. AUDIO CHANNELS
                    const isAudio = mime.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(name);
                    if (isAudio) {
                      return (
                        <div className="flex flex-col items-center justify-center py-16 px-10 bg-white/[0.02] border border-white/5 rounded-[32px] w-full max-w-md mx-auto space-y-6 shadow-2xl select-none">
                          <div className="p-5 bg-amber-accent/10 border border-amber-accent/20 rounded-full text-amber-accent animate-pulse">
                            <AudioIcon className="w-10 h-10" />
                          </div>
                          <div className="text-center space-y-1">
                            <p className="font-serif text-lg font-light text-white truncate max-w-[280px]">{previewFile.fileName}</p>
                            <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">{formatBytes(previewFile.fileSize)}</p>
                          </div>
                          <audio src={resolvedPreviewUrl} controls className="w-full" autoPlay />
                        </div>
                      );
                    }

                    // 4. PDF DOCUMENT VIEWER
                    const isPdf = mime.includes('pdf') || name.endsWith('.pdf');
                    if (isPdf) {
                      return (
                        <div className="w-full h-full min-h-0">
                          <PdfViewer
                            url={resolvedPreviewUrl}
                            fileName={previewFile.fileName}
                            fileSize={previewFile.fileSize}
                          />
                        </div>
                      );
                    }

                    // 5. WORD DOCUMENT CLIENT-SIDE RENDERING
                    const isWord = mime.includes('word') || mime.includes('officedocument.word') || mime.includes('msword') || mime.includes('rtf') || /\.(docx?|odt|rtf)$/i.test(name);
                    if (isWord) {
                      const isRealDocx = name.endsWith('.docx');
                      if (isRealDocx) {
                        return (
                          <div className="w-full h-full min-h-0">
                            <DocxViewer url={resolvedPreviewUrl} />
                          </div>
                        );
                      } else {
                        return (
                          <div className="flex flex-col items-center justify-center space-y-4 text-center max-w-md mx-auto bg-stone-900 border border-white/5 rounded-[24px] p-8 shadow-2xl select-none">
                            <div className="p-4 bg-amber-accent/10 rounded-full text-amber-accent">
                              <FileText className="w-8 h-8" />
                            </div>
                            <h4 className="font-serif text-lg text-white font-light">Legacy Document Viewer</h4>
                            <p className="text-xs text-gray-400 leading-relaxed font-light">
                              The reader offers premium web styling for modern <strong>.DOCX</strong> formats. For <strong>.{name.split('.').pop()?.toUpperCase()}</strong>, download locally to view.
                            </p>
                            <button
                              onClick={() => handleDownload(previewFile)}
                              className="px-5 py-2.5 bg-amber-accent text-black hover:bg-white rounded-xl text-xs font-black transition-colors"
                            >
                              Download Asset
                            </button>
                          </div>
                        );
                      }
                    }

                    // 6. EXCEL / SPREADSHEETS CLIENT-SIDE
                    const isSpreadsheet = mime.includes('excel') || mime.includes('sheet') || mime.includes('csv') || /\.(xlsx?|csv)$/i.test(name);
                    if (isSpreadsheet) {
                      return (
                        <div className="w-full h-full min-h-0">
                          <XlsxViewer url={resolvedPreviewUrl} />
                        </div>
                      );
                    }

                    // 7. POWERPOINT
                    const isPowerpoint = mime.includes('presentation') || mime.includes('powerpoint') || name.endsWith('.pptx') || name.endsWith('.ppt');
                    if (isPowerpoint) {
                      return (
                        <div className="flex flex-col items-center justify-center space-y-4 text-center max-w-md mx-auto bg-stone-900 border border-white/5 rounded-[24px] p-8 shadow-2xl select-none">
                          <div className="p-4 bg-teal-400/10 rounded-full text-teal-400">
                            <FileSpreadsheet className="w-8 h-8" />
                          </div>
                          <h4 className="font-serif text-lg text-white font-light">Presentation Document</h4>
                          <p className="text-xs text-gray-400 leading-relaxed font-light">
                            Slides and PowerPoint layouts can not be edited offline. Download the file or use secure offline viewer tools.
                          </p>
                          <button
                            onClick={() => handleDownload(previewFile)}
                            className="px-5 py-2.5 bg-teal-400 text-black hover:bg-white rounded-xl text-xs font-black transition-colors"
                          >
                            Download presentation
                          </button>
                        </div>
                      );
                    }

                    // 8. TEXT CHANNELS
                    const isText = mime.startsWith('text/') || mime.includes('json') || mime.includes('xml') || /\.(json|txt|xml|rtf)$/i.test(name);
                    if (isText) {
                      if (loadingTextContent) {
                        return (
                          <div className="space-y-2 text-center text-gray-500 py-12">
                            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-accent" />
                            <p className="text-[11px] font-mono uppercase tracking-widest">Streaming characters...</p>
                          </div>
                        );
                      }
                      return (
                        <div className="w-full text-left bg-stone-900 p-6 rounded-2xl max-h-[80vh] overflow-auto border border-white/5 font-mono text-xs text-amber-accent/95 select-all no-scrollbar leading-relaxed">
                          <pre className="whitespace-pre-wrap breakdown-all">{textFileContent || 'Empty File'}</pre>
                        </div>
                      );
                    }

                    // 9. COMPLETE MULTIMEDIA FALLBACK
                    return (
                      <div className="text-center py-12 space-y-4 max-w-sm select-none">
                        <div className="p-4 bg-white/[0.03] border border-white/5 rounded-full text-amber-accent inline-block">
                          <FileText className="w-8 h-8" />
                        </div>
                        <div className="space-y-1.5">
                          <h4 className="font-serif text-lg text-white font-light">Secure Sandbox Shielded</h4>
                          <p className="text-xs text-gray-500 font-light leading-relaxed">
                            Web visualization is unavailable for files of format: <strong>{previewFile.mimeType || 'binary/octet-stream'}</strong>. Please download the file to view locally.
                          </p>
                        </div>
                        <button
                          onClick={() => handleDownload(previewFile)}
                          className="px-5 py-2.5 bg-amber-accent text-black hover:bg-white rounded-xl text-xs font-black transition-colors"
                        >
                          Download to Extract
                        </button>
                      </div>
                    );
                  })()}
                </div>
              )}
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
