import React, { useState, useCallback } from 'react';
import { 
  SplitOrientation, 
  ProcessingStatus 
} from './types';
import { splitPdfDocument, downloadBlob } from './services/pdfService';
import { PdfPreview } from './components/PdfPreview';
import { 
  UploadIcon, 
  ScissorsIcon, 
  VerticalSplitIcon, 
  HorizontalSplitIcon,
  FileIcon,
  LoaderIcon
} from './components/Icons';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [orientation, setOrientation] = useState<SplitOrientation>(SplitOrientation.Vertical);
  const [percentage, setPercentage] = useState<number>(50);
  const [status, setStatus] = useState<ProcessingStatus>({
    isProcessing: false,
    error: null,
    successMessage: null,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf') {
        setStatus({ ...status, error: "Please upload a valid PDF file.", successMessage: null });
        return;
      }
      setFile(selectedFile);
      setStatus({ isProcessing: false, error: null, successMessage: null });
      setPercentage(50); // Reset percentage on new file
    }
  };

  const handleProcess = async () => {
    if (!file) return;

    setStatus({ isProcessing: true, error: null, successMessage: null });

    try {
      // Small delay to allow UI to update to loading state
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const newPdfBytes = await splitPdfDocument(file, orientation, percentage);
      downloadBlob(newPdfBytes, file.name, orientation, percentage);
      
      setStatus({
        isProcessing: false,
        error: null,
        successMessage: `Successfully split "${file.name}"! check your downloads.`
      });
    } catch (err: any) {
      console.error(err);
      setStatus({
        isProcessing: false,
        error: "An error occurred while processing the PDF. The file might be corrupted or password protected.",
        successMessage: null
      });
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-600 rounded-2xl shadow-lg mb-2">
            <ScissorsIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            PDF Splitter <span className="text-indigo-600">Pro</span>
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Split PDF pages precisely where you need. Processed securely in your browser.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
          <div className="p-8 sm:p-10 space-y-10">
            
            {/* 1. File Upload Section */}
            <div className={`relative transition-all duration-300 ease-in-out ${file ? 'p-2' : ''}`}>
              {!file ? (
                <label className="flex flex-col items-center justify-center w-full h-48 border-3 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:bg-gray-50 hover:border-indigo-400 transition-all group">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <div className="p-4 bg-indigo-50 rounded-full mb-3 group-hover:scale-110 transition-transform">
                       <UploadIcon className="w-8 h-8 text-indigo-500" />
                    </div>
                    <p className="mb-2 text-lg font-medium text-gray-700">Click to upload PDF</p>
                    <p className="text-sm text-gray-400">PDF documents only</p>
                  </div>
                  <input type="file" className="hidden" accept="application/pdf" onChange={handleFileChange} />
                </label>
              ) : (
                <div className="flex items-center justify-between p-5 bg-indigo-50 border border-indigo-100 rounded-2xl">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm">
                      <FileIcon className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 truncate max-w-[200px] sm:max-w-sm">{file.name}</p>
                      <p className="text-sm text-indigo-500 cursor-pointer hover:underline" onClick={() => setFile(null)}>Change file</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setFile(null)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-2"
                    aria-label="Remove file"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              )}
            </div>

            {/* Content that only shows when file is selected */}
            {file && (
              <div className="flex flex-col space-y-10 animate-fade-in-up">
                
                {/* Top Controls: Orientation & Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Orientation Toggle */}
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Split Direction</label>
                      <div className="grid grid-cols-2 gap-3 p-1 bg-gray-100 rounded-xl">
                        <button
                          onClick={() => setOrientation(SplitOrientation.Vertical)}
                          className={`flex items-center justify-center space-x-2 py-3 rounded-lg text-sm font-semibold transition-all shadow-sm ${
                            orientation === SplitOrientation.Vertical 
                              ? 'bg-white text-indigo-600 shadow-md ring-1 ring-black/5' 
                              : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700 shadow-none'
                          }`}
                        >
                          <VerticalSplitIcon className="w-4 h-4" />
                          <span>Vertical</span>
                        </button>
                        <button
                          onClick={() => setOrientation(SplitOrientation.Horizontal)}
                          className={`flex items-center justify-center space-x-2 py-3 rounded-lg text-sm font-semibold transition-all shadow-sm ${
                            orientation === SplitOrientation.Horizontal
                              ? 'bg-white text-indigo-600 shadow-md ring-1 ring-black/5' 
                              : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700 shadow-none'
                          }`}
                        >
                          <HorizontalSplitIcon className="w-4 h-4" />
                          <span>Horizontal</span>
                        </button>
                      </div>
                    </div>

                    {/* Percentage Display */}
                    <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 flex flex-col justify-center space-y-1">
                       <div className="flex justify-between items-baseline">
                          <span className="text-sm font-bold text-indigo-900 uppercase">Cut Position</span>
                          <span className="text-3xl font-extrabold text-indigo-600">{percentage}%</span>
                       </div>
                       <p className="text-sm text-indigo-700">
                          Drag the <span className="font-bold text-red-500">red line</span> in the preview below to adjust.
                       </p>
                    </div>
                </div>

                {/* Preview Section */}
                <div className="w-full">
                  <PdfPreview 
                    file={file} 
                    orientation={orientation} 
                    percentage={percentage} 
                    onPercentageChange={setPercentage}
                  />
                </div>

                {/* Action Button & Status */}
                <div className="max-w-2xl mx-auto w-full space-y-6 pt-2">
                  <button
                    onClick={handleProcess}
                    disabled={status.isProcessing}
                    className={`w-full flex items-center justify-center space-x-2 py-4 rounded-xl text-lg font-bold text-white shadow-xl shadow-indigo-200 transition-all transform active:scale-[0.98] ${
                      status.isProcessing 
                        ? 'bg-indigo-400 cursor-not-allowed' 
                        : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-2xl hover:-translate-y-0.5'
                    }`}
                  >
                    {status.isProcessing ? (
                      <>
                        <LoaderIcon className="w-6 h-6" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <ScissorsIcon className="w-6 h-6" />
                        <span>Split & Download PDF</span>
                      </>
                    )}
                  </button>

                  {/* Status Messages */}
                  {status.error && (
                    <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm animate-pulse text-center">
                      <strong>Error:</strong> {status.error}
                    </div>
                  )}
                  {status.successMessage && (
                    <div className="p-4 bg-green-50 text-green-700 rounded-xl border border-green-100 text-sm text-center">
                      <strong>Success:</strong> {status.successMessage}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-gray-400 text-sm pb-8">
          <p>© {new Date().getFullYear()} PDF Splitter Pro. All processing happens locally in your browser.</p>
        </footer>

      </div>
      
      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

export default App;
