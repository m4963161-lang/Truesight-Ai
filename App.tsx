import React, { useState, useCallback, useEffect } from 'react';
import { MediaType, AnalysisState } from './types';
import { analyzeMedia } from './services/geminiService';
import Uploader from './components/Uploader';
import Report from './components/Report';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MediaType>(MediaType.IMAGE);
  const [showInfo, setShowInfo] = useState(false);
  const [isSharedView, setIsSharedView] = useState(false);

  const [state, setState] = useState<AnalysisState>({
    isLoading: false,
    error: null,
    report: null,
    previewUrl: null,
    currentFile: null,
  });

  // Handle URL-based shared report
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedData = params.get('report');
    const type = params.get('type') as MediaType;

    if (sharedData) {
      try {
        const decodedData = JSON.parse(atob(sharedData));

        setState(prev => ({
          ...prev,
          report: decodedData,
          isLoading: false,
          error: null,
        }));

        if (type) {
          setActiveTab(type);
        }

        setIsSharedView(true);
      } catch (err) {
        console.error('Failed to decode shared report:', err);

        setState(prev => ({
          ...prev,
          error:
            'The shared forensic report link is invalid or has expired.',
        }));
      }
    }
  }, []);

  // Reset application
  const resetState = useCallback(() => {
    setState(prev => {
      if (prev.previewUrl) {
        URL.revokeObjectURL(prev.previewUrl);
      }

      return {
        isLoading: false,
        error: null,
        report: null,
        previewUrl: null,
        currentFile: null,
      };
    });

    setIsSharedView(false);

    // Remove query parameters
    window.history.pushState({}, '', window.location.pathname);
  }, []);

  // Handle file upload and analysis
  const handleFileSelect = useCallback(
    async (file: File) => {
      // 25 MB maximum file size
      const maxSizeBytes = 25 * 1024 * 1024;

      if (file.size > maxSizeBytes) {
        setState(prev => ({
          ...prev,
          error:
            'Sample exceeds laboratory processing limit (25MB). Please provide a shorter or lower-resolution clip.',
        }));

        return;
      }

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);

      // Set loading state
      setState(prev => {
        if (prev.previewUrl) {
          URL.revokeObjectURL(prev.previewUrl);
        }

        return {
          ...prev,
          isLoading: true,
          error: null,
          report: null,
          previewUrl,
          currentFile: file,
        };
      });

      try {
        console.log('========================================');
        console.log('TrueSight AI - Analysis Started');
        console.log('========================================');
        console.log('File name:', file.name);
        console.log('File type:', file.type);
        console.log('File size:', file.size);
        console.log('Media type:', activeTab);

        // Call forensic analysis engine
        const report = await analyzeMedia(file, activeTab);

        console.log('Analysis completed successfully.');
        console.log('Report:', report);

        setState(prev => {
          if (!prev.isLoading && !prev.currentFile) {
            return prev;
          }

          return {
            ...prev,
            isLoading: false,
            error: null,
            report,
          };
        });
      } catch (err: unknown) {
        console.error('========================================');
        console.error('TrueSight AI - Analysis Failed');
        console.error('========================================');
        console.error(err);

        let errorMessage =
          'Scanning engine failed. Please check the file and try again.';

        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === 'string') {
          errorMessage = err;
        } else if (err && typeof err === 'object') {
          const errorObject = err as {
            message?: string;
            error?: string;
          };

          if (errorObject.message) {
            errorMessage = errorObject.message;
          } else if (errorObject.error) {
            errorMessage = errorObject.error;
          }
        }

        setState(prev => {
          if (!prev.isLoading && !prev.currentFile) {
            return prev;
          }

          return {
            ...prev,
            isLoading: false,
            error: errorMessage,
          };
        });
      }
    },
    [activeTab]
  );

  // Toggle information panel
  const toggleInfo = () => {
    setShowInfo(prev => !prev);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-[#fafafa] selection:bg-blue-500/30">

      {/* ============================================================
          FORENSIC LAB AMBIENCE BACKGROUND
      ============================================================ */}

      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30">

        <div className="absolute top-[-15%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[160px] animate-pulse"></div>

        <div
          className="absolute bottom-[-15%] right-[-10%] w-[60%] h-[60%] bg-blue-900/15 blur-[160px] animate-pulse"
          style={{ animationDelay: '2.5s' }}
        ></div>

      </div>

      {/* ============================================================
          NAVIGATION HEADER
      ============================================================ */}

      <nav className="sticky top-0 z-50 glass-panel border-b border-white/5 px-6 md:px-12 py-4 flex items-center justify-between animate-fade-up">

        {/* Logo / Brand */}

        <div
          className="flex items-center gap-5 group cursor-pointer"
          onClick={resetState}
        >

          <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.4)] transition-all duration-700 group-hover:rotate-[360deg] group-hover:scale-105">

            <i className="fas fa-fingerprint text-white text-xl md:text-2xl"></i>

          </div>

          <div>

            <h1 className="text-xl md:text-2xl font-black tracking-tighter text-white flex items-center gap-2">

              TrueSight AI

              {isSharedView && (
                <span className="text-[9px] px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30 uppercase font-black tracking-widest">
                  Shared Report
                </span>
              )}

            </h1>

            <p className="text-[9px] md:text-[10px] uppercase tracking-[0.5em] text-blue-500 font-black mt-0.5 opacity-80">
              Forensic Laboratory
            </p>

          </div>

        </div>

        {/* Header Controls */}

        <div className="flex items-center gap-4">

          <button
            onClick={toggleInfo}
            className="w-10 h-10 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-blue-500 hover:border-blue-500/40 transition-all active:scale-90"
            title="Forensic Protocols"
          >
            <i
              className={`fas ${
                showInfo ? 'fa-times' : 'fa-info-circle'
              }`}
            ></i>
          </button>

          <div className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl hover:bg-emerald-500/10 transition-colors cursor-default">

            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.6)]"></div>

            <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">
              SafeScan Enabled
            </span>

          </div>

        </div>

      </nav>

      {/* ============================================================
          MAIN CONTENT
      ============================================================ */}

      <main className="flex-1 container mx-auto px-4 py-8 md:py-16 max-w-6xl relative z-10">

        {/* ========================================================
            INFORMATION PANEL
        ======================================================== */}

        {showInfo && (
          <div className="max-w-3xl mx-auto glass-panel border-blue-500/30 p-8 md:p-10 rounded-[2.5rem] mb-12 animate-fade-up shadow-2xl relative overflow-hidden">

            <div className="absolute top-0 right-0 p-8 opacity-5">
              <i className="fas fa-microscope text-8xl"></i>
            </div>

            <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">

              <i className="fas fa-shield-halved text-blue-500"></i>

              Responsible AI Transparency Protocol

            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-sm text-zinc-400 leading-relaxed">

              <div className="space-y-4">

                <p>
                  <strong className="text-zinc-200">
                    Multimodal Integrity:
                  </strong>{' '}
                  TrueSight AI applies specific forensic kernels to Audio
                  (spectral), Video (temporal), and Image (geometric)
                  primitives.
                </p>

                <p>
                  <strong className="text-zinc-200">
                    Encrypted Processing:
                  </strong>{' '}
                  Analysis occurs in ephemeral environments. We do not retain,
                  store, or train on your uploaded media.
                </p>

              </div>

              <div className="space-y-4">

                <p>
                  <strong className="text-zinc-200">
                    Marker Detection:
                  </strong>{' '}
                  We categorize artifacts into GAN signatures, diffusion
                  noise, and temporal drift to provide explainable verdicts.
                </p>

                <p>
                  <strong className="text-zinc-200">
                    Ethical AI:
                  </strong>{' '}
                  This tool is designed for digital literacy and deepfake
                  awareness, providing probabilistic confidence scores.
                </p>

              </div>

            </div>

            <button
              onClick={toggleInfo}
              className="mt-10 flex items-center gap-3 text-[10px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-400 transition-colors group"
            >

              <i className="fas fa-arrow-left transition-transform group-hover:-translate-x-1"></i>

              [ Close Lab Protocols ]

            </button>

          </div>
        )}

        {/* ========================================================
            HOME / UPLOAD SCREEN
        ======================================================== */}

        {!state.report &&
          !state.isLoading &&
          !state.error && (
            <div className="max-w-4xl mx-auto space-y-12 md:space-y-20">

              {/* Hero Section */}

              <div className="text-center space-y-8 animate-fade-up">

                <div className="inline-flex items-center gap-3 px-5 py-2 bg-blue-500/5 border border-blue-500/10 rounded-full mb-4 shadow-xl">

                  <i className="fas fa-satellite-dish text-blue-500 text-[10px] animate-pulse"></i>

                  <span className="text-[10px] text-blue-400 font-black uppercase tracking-[0.5em]">
                    Forensic Scan Terminal
                  </span>

                </div>

                <h2 className="text-5xl md:text-8xl font-black tracking-tighter text-white leading-[0.9] mb-8">

                  Distinguish{' '}

                  <span className="text-blue-500">
                    Synthetic
                  </span>

                  <br className="hidden md:block" />

                  from Organic.

                </h2>

                <p className="text-zinc-500 text-lg md:text-2xl max-w-3xl mx-auto font-medium leading-relaxed">

                  Advanced multimodal forensic engine for identifying
                  generative AI artifacts in Images, Video, and Audio.

                </p>

                {/* Media Type Selection */}

                <div className="flex flex-wrap justify-center gap-3 mt-16 bg-zinc-950/40 p-3 rounded-[2.5rem] border border-white/5 max-w-xl mx-auto shadow-2xl backdrop-blur-md">

                  {(Object.values(MediaType) as MediaType[]).map(type => (

                    <button
                      key={type}
                      onClick={() => setActiveTab(type)}
                      className={`flex-1 min-w-[120px] px-8 py-4 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-500 flex items-center justify-center gap-3 active:scale-95 border ${
                        activeTab === type
                          ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30 border-blue-400 scale-105 z-10'
                          : 'text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900 border-transparent'
                      }`}
                    >

                      <i
                        className={`fas ${
                          type === MediaType.IMAGE
                            ? 'fa-image'
                            : type === MediaType.VIDEO
                            ? 'fa-play-circle'
                            : 'fa-microphone-lines'
                        } ${
                          activeTab === type
                            ? 'animate-pulse'
                            : ''
                        }`}
                      ></i>

                      {type}

                    </button>

                  ))}

                </div>

              </div>

              {/* Upload Component */}

              <div
                className="max-w-2xl mx-auto animate-fade-up"
                style={{ animationDelay: '0.2s' }}
              >

                <Uploader
                  onFileSelect={handleFileSelect}
                  selectedType={activeTab}
                />

                <div className="flex justify-center gap-10 mt-12 opacity-30 grayscale hover:grayscale-0 hover:opacity-80 transition-all duration-1000">

                  <i
                    className="fab fa-react text-2xl"
                    title="Forensic UI: React"
                  ></i>

                  <i
                    className="fas fa-brain text-2xl"
                    title="Processing Hub: Gemini"
                  ></i>

                  <i
                    className="fas fa-fingerprint text-2xl"
                    title="Signature Verification"
                  ></i>

                </div>

              </div>

            </div>
          )}

        {/* ========================================================
            LOADING SCREEN
        ======================================================== */}

        {state.isLoading && (

          <div className="flex flex-col items-center justify-center py-24 animate-fade-up">

            <div className="w-32 h-32 relative mb-12 animate-float">

              <div className="absolute inset-0 border-[6px] border-blue-600/10 rounded-[2.5rem]"></div>

              <div className="absolute inset-0 border-[6px] border-blue-600 border-t-transparent rounded-[2.5rem] animate-spin"></div>

              <div className="absolute inset-0 flex items-center justify-center">

                <i
                  className={`fas ${
                    activeTab === MediaType.IMAGE
                      ? 'fa-image'
                      : activeTab === MediaType.VIDEO
                      ? 'fa-film'
                      : 'fa-microphone-lines'
                  } text-4xl text-blue-500 animate-pulse`}
                ></i>

              </div>

            </div>

            <h3 className="text-3xl font-black text-white mb-3 tracking-tighter uppercase italic">
              Forensic Sequence Initiated
            </h3>

            <p className="text-zinc-500 mono text-xs tracking-[0.2em] max-w-sm text-center uppercase opacity-80 mb-12">

              Isolating {activeTab} primitives...

              <br />

              Running spectral inconsistency check...

            </p>

            <button
              onClick={resetState}
              className="px-12 py-5 rounded-2xl bg-zinc-950 hover:bg-zinc-900 text-[10px] font-black uppercase tracking-[0.4em] transition-all border border-white/5 hover:border-red-500/40 flex items-center gap-3 group shadow-2xl"
            >

              <i className="fas fa-power-off text-red-500 group-hover:scale-110 transition-transform"></i>

              Abort Analysis Process

            </button>

          </div>
        )}

        {/* ========================================================
            ERROR SCREEN
        ======================================================== */}

        {state.error && (

          <div className="max-w-lg mx-auto p-12 glass-panel border-red-500/30 rounded-[3.5rem] flex flex-col items-center text-center animate-fade-up shadow-[0_50px_100px_-20px_rgba(239,68,68,0.25)] relative overflow-hidden">

            <div className="absolute top-0 left-0 w-full h-1 bg-red-500/20"></div>

            <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center text-red-500 mb-8 animate-pulse border border-red-500/20">

              <i className="fas fa-triangle-exclamation text-3xl"></i>

            </div>

            <h4 className="text-2xl font-black text-white mb-4 uppercase tracking-tighter">
              Laboratory Exception
            </h4>

            <p className="text-zinc-500 text-base mb-12 leading-relaxed font-medium px-4 break-words">
              {state.error}
            </p>

            <button
              onClick={resetState}
              className="w-full py-5 bg-zinc-900 rounded-2xl text-[11px] font-black text-white hover:bg-zinc-800 transition-all border border-white/10 shadow-2xl uppercase tracking-[0.5em] flex items-center justify-center gap-3 group active:scale-[0.98]"
            >

              <i className="fas fa-arrow-left transition-transform group-hover:-translate-x-2"></i>

              Return to Lab Terminal

            </button>

          </div>
        )}

        {/* ========================================================
            FORENSIC REPORT
        ======================================================== */}

        {state.report && (

          <Report
            report={state.report}
            previewUrl={state.previewUrl}
            mediaType={activeTab}
            onBack={resetState}
            isShared={isSharedView}
          />

        )}

      </main>

      {/* ============================================================
          ANIMATIONS
      ============================================================ */}

      <style>{`

        @keyframes fade-up {

          from {
            opacity: 0;
            transform: translateY(30px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }

        }

        @keyframes float {

          0% {
            transform: translateY(0px);
          }

          50% {
            transform: translateY(-15px);
          }

          100% {
            transform: translateY(0px);
          }

        }

        .animate-fade-up {
          animation: fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .animate-float {
          animation: float 4s ease-in-out infinite;
        }

        .glass-panel {
          background: rgba(18, 18, 22, 0.6);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

      `}</style>

    </div>
  );
};

export default App;