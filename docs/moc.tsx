import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Book, Mic, Play, Square, FastForward, Settings, Folder, FileText, ChevronRight, Hash } from 'lucide-react';

const App = () => {
  const [activeStep, setActiveStep] = useState(1);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isTiming, setIsTiming] = useState(false);
  const [currentPath, setCurrentPath] = useState("2024/05/week1/day1/reading.md");

  // Steps definition based on the video
  const steps = [
    { id: 1, title: "1. Idea (日本語ネタ出し)", icon: <Terminal size={18} /> },
    { id: 2, title: "2. Words (単語帳作成)", icon: <Book size={18} /> },
    { id: 3, title: "3. Reading (WPM計測)", icon: <FileText size={18} /> },
    { id: 4, title: "4. Listening (say/WebTTS)", icon: <Play size={18} /> },
    { id: 5, title: "5. Speech (録音/STT)", icon: <Mic size={18} /> },
    { id: 6, title: "6. 3-2-1 (画像想起)", icon: <FastForward size={18} /> },
    { id: 7, title: "7. Roleplay (Gemini Chat)", icon: <Mic size={18} /> },
  ];

  // Mock data for Step 3
  const mockText = "I love coffee. Every morning, I grind fresh beans. The aroma is wonderful. I prefer a light roast because I enjoy the bright acidity...";
  const wordCount = mockText.split(/\s+/).length;

  // WPM Timer logic
  useEffect(() => {
    let interval;
    if (isTiming) {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isTiming]);

  const handleStartTiming = () => {
    setTimer(0);
    setIsTiming(true);
  };

  const handleStopTiming = () => {
    setIsTiming(false);
    const minutes = timer / 60;
    setWpm(Math.round(wordCount / (minutes || 1)));
  };

  return (
    <div className="flex h-screen bg-[#1a1b26] text-[#a9b1d6] font-mono overflow-hidden selection:bg-[#364a82]">
      {/* Sidebar - Directory Structure */}
      <div className={`w-72 bg-[#16161e] border-r border-[#24283b] flex flex-col transition-all ${isSidebarOpen ? '' : 'w-0 overflow-hidden'}`}>
        <div className="p-4 border-b border-[#24283b] flex items-center gap-2 text-[#7aa2f7]">
          <Folder size={18} />
          <span className="font-bold text-sm">GITHUB_REPOS/ENG</span>
        </div>
        <div className="flex-1 p-2 text-sm overflow-y-auto">
          <div className="flex items-center gap-2 p-1 opacity-60"><ChevronRight size={14}/> 2024</div>
          <div className="ml-4 flex items-center gap-2 p-1 opacity-60"><ChevronRight size={14}/> 05</div>
            <div className="ml-8">
              <div className="flex items-center gap-2 p-1 text-[#e0af68] bg-[#24283b] rounded"><FileText size={14}/> week1</div>
              <div className="ml-4 space-y-1 mt-1">
                {['topic.md', 'words.md'].map(file => (
                  <div key={file} className="flex items-center gap-2 p-1 hover:text-white cursor-pointer opacity-80">
                     <Hash size={12} /> {file}
                  </div>
                ))}
              </div>
              <div className="ml-4 mt-2 space-y-1">
                <div className="flex items-center gap-2 p-1 text-[#9ece6a] bg-[#1f2335] rounded text-[11px] uppercase">day1</div>
                <div className="ml-4 space-y-1 mt-1">
                  {['reading.md', 'feedback.md', 'speech.wav', 'speech_transcript.txt'].map(file => (
                    <div key={file} className="flex items-center gap-2 p-1 hover:text-white cursor-pointer opacity-80 text-[11px]">
                      <Hash size={12} /> {`day1/${file}`}
                    </div>
                  ))}
                </div>
              </div>
            </div>
        </div>
        <div className="p-4 border-t border-[#24283b] text-[10px] opacity-40">
          Status: Synced to origin/main
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Header / Tabs */}
        <div className="h-10 bg-[#1f2335] flex items-center px-4 gap-4 border-b border-[#24283b]">
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-[#24283b] rounded">
            <Terminal size={16} />
          </button>
          <div className="text-xs opacity-50 flex items-center gap-2">
            <span>{currentPath}</span>
          </div>
          <div className="ml-auto flex items-center gap-4 text-xs">
            <span className="text-[#9ece6a]">Gemini API: OK</span>
            <span className="text-[#bb9af7]">TTS: say (macOS)</span>
          </div>
        </div>

        {/* Step Navigation Bar */}
        <div className="flex bg-[#16161e] p-1 gap-1">
          {steps.map(step => (
            <button
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] rounded transition-all ${
                activeStep === step.id 
                ? 'bg-[#7aa2f7] text-[#1a1b26] font-bold shadow-lg' 
                : 'hover:bg-[#24283b] text-[#565f89]'
              }`}
            >
              {step.icon}
              <span className="hidden md:inline">{step.title}</span>
            </button>
          ))}
        </div>

        {/* Workspace */}
        <div className="flex-1 p-8 overflow-y-auto">
          {activeStep === 3 && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="flex items-center justify-between border-b border-[#24283b] pb-4">
                <h2 className="text-xl text-[#7aa2f7] flex items-center gap-2">
                  <FileText size={24} /> STEP 3: Narrow Reading
                </h2>
                <div className="flex gap-2">
                   {!isTiming ? (
                     <button onClick={handleStartTiming} className="bg-[#9ece6a] text-[#1a1b26] px-4 py-1 rounded text-sm font-bold flex items-center gap-2 hover:brightness-110">
                       <Play size={14} /> START TIMER
                     </button>
                   ) : (
                     <button onClick={handleStopTiming} className="bg-[#f7768e] text-[#1a1b26] px-4 py-1 rounded text-sm font-bold flex items-center gap-2 hover:brightness-110">
                       <Square size={14} /> STOP (DONE)
                     </button>
                   )}
                </div>
              </div>

              <div className="bg-[#24283b] p-6 rounded-lg text-lg leading-relaxed shadow-xl border border-[#414868]">
                {mockText}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#16161e] p-4 rounded border border-[#24283b] text-center">
                  <div className="text-[10px] opacity-50 uppercase mb-1">Timer</div>
                  <div className="text-2xl font-bold text-[#e0af68]">{timer}s</div>
                </div>
                <div className="bg-[#16161e] p-4 rounded border border-[#24283b] text-center">
                  <div className="text-[10px] opacity-50 uppercase mb-1">Words</div>
                  <div className="text-2xl font-bold text-[#7dcfff]">{wordCount}</div>
                </div>
                <div className="bg-[#16161e] p-4 rounded border border-[#24283b] text-center">
                  <div className="text-[10px] opacity-50 uppercase mb-1">Result WPM</div>
                  <div className="text-2xl font-bold text-[#9ece6a]">{wpm || '--'}</div>
                </div>
              </div>
            </div>
          )}

          {activeStep === 4 && (
            <div className="max-w-2xl mx-auto space-y-6">
              <h2 className="text-xl text-[#bb9af7] flex items-center gap-2 border-b border-[#24283b] pb-4">
                <Play size={24} /> STEP 4: Listening (say)
              </h2>
              <div className="bg-[#16161e] p-6 rounded border border-[#24283b] space-y-6">
                <div className="flex items-center gap-6">
                  <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                      isPlaying ? 'bg-[#f7768e] shadow-[0_0_20px_rgba(247,118,142,0.3)]' : 'bg-[#bb9af7] shadow-[0_0_20px_rgba(187,154,247,0.3)]'
                    }`}
                  >
                    {isPlaying ? <Square size={24} color="#1a1b26" fill="#1a1b26" /> : <Play size={24} color="#1a1b26" fill="#1a1b26" />}
                  </button>
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between text-xs opacity-60">
                      <span>Rate: 180 wpm</span>
                      <span>Voice: Samantha (Mac Default)</span>
                    </div>
                    <div className="h-1 bg-[#24283b] rounded-full overflow-hidden">
                      <div className={`h-full bg-[#bb9af7] transition-all duration-1000 ${isPlaying ? 'w-full' : 'w-0'}`}></div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-[#1f2335] rounded border border-[#414868] opacity-80 text-sm">
                   <div className="flex gap-2 mb-2 text-[#7aa2f7] font-bold">Terminal Execution:</div>
                   <code className="text-[#9ece6a]">$ say -r 180 "{mockText.substring(0, 30)}..."</code>
                </div>
              </div>
            </div>
          )}

          {activeStep !== 3 && activeStep !== 4 && (
            <div className="flex flex-col items-center justify-center h-full opacity-30">
               <Terminal size={64} />
               <p className="mt-4 text-sm uppercase tracking-widest">Select step from top bar to simulate TUI</p>
            </div>
          )}
        </div>

        {/* Bottom Status Bar */}
        <div className="h-6 bg-[#7aa2f7] text-[#1a1b26] flex items-center px-2 text-[10px] font-bold justify-between">
          <div className="flex gap-4">
            <span>NORMAL MODE</span>
            <span>github.com/user/english-study.git</span>
          </div>
          <div className="flex gap-4">
            <span>UTF-8</span>
            <span>Step: {activeStep}/7</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
