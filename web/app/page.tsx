"use client";

import { useEffect, useState } from "react";
import { useLearning } from "./hooks/useLearning";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { StepNav } from "./components/StepNav";
import { SettingsPanel } from "./components/SettingsPanel";
import { IdeaStep } from "./components/steps/IdeaStep";
import { WordsStep } from "./components/steps/WordsStep";
import { ReadingStep } from "./components/steps/ReadingStep";
import { ListeningStep } from "./components/steps/ListeningStep";
import { SpeechStep } from "./components/steps/SpeechStep";
import { SceneStep } from "./components/steps/SceneStep";
import { RoleplayStep } from "./components/steps/RoleplayStep";
import { StorageUnavailableReason } from "./lib/types";

const DAY_OPTIONS = Array.from({ length: 7 }, (_, index) => `day${index + 1}`);
const formatDayLabel = (day: string) => {
  const number = day.replace(/[^0-9]/g, "");
  return `Day ${number || "1"}`;
};

const storageReasonCopy: Record<StorageUnavailableReason, string> = {
  missing_config: "LEARNING_DATA_DIR is not configured",
  missing_directory: "Configured directory does not exist",
  not_directory: "Configured path is not a directory",
};

export default function HomePage() {
  const [activeStep, setActiveStep] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const learning = useLearning();
  const { setSettingsOpen } = learning;
  const handleWeekSelect = (week: string) => {
    learning.setActiveWeek(week);
    void learning.loadWeekFiles(week, learning.activeDay || "day1");
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "?") {
        event.preventDefault();
        setSettingsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setSettingsOpen]);

  const stepPanels = [
    <IdeaStep topicInput={learning.topicInput} onTopicInputChange={learning.setTopicInput} ideaLoading={learning.ideaLoading} errorMessage={learning.errorMessage} handleGenerateTopic={learning.handleGenerateTopic} cefrLevel={learning.cefrLevel} ideaResponse={learning.ideaResponse} topicHeader={learning.topicHeader} derivedStage={learning.derivedStage} reviewsCopy={learning.reviewsCopy} key="idea" />,
    <WordsStep
      wordsTable={learning.wordsTable}
      wordsCount={learning.wordsCount}
      handleRegenerateWordsAction={learning.handleRegenerateWords}
      handleAddWordAction={learning.handleAddWord}
      handleEditWordAction={learning.handleEditWord}
      handleDeleteWordAction={learning.handleDeleteWord}
      manualModeActive={learning.manualModeActive}
      manualMarkdown={learning.manualWordsMarkdown}
      manualWordsRowCount={learning.manualWordsRowCount}
      manualImportReady={learning.manualImportReady}
      onManualMarkdownChangeAction={learning.handleManualWordsMarkdownChange}
      onManualWordsImportAction={learning.handleManualWordsImport}
      key="words"
    />,
    <ReadingStep
      readingOutput={learning.readingOutput}
      readingWordCount={learning.readingWordCount}
      timerSeconds={learning.timerSeconds}
      wpmResult={learning.wpmResult}
      isTiming={learning.isTiming}
      handleStartTimerAction={learning.handleStartTimer}
      handleStopTimerAction={learning.handleStopTimer}
      handleRegenerateReadingAction={learning.handleRegenerateReading}
      cefrLevel={learning.cefrLevel}
      topicHeader={learning.topicHeader}
      manualModeActive={learning.manualModeActive}
      onManualReadingChangeAction={learning.handleManualReadingChange}
      readingStatus={learning.readingStatus}
      key="reading"
    />,
    <ListeningStep readingOutput={learning.readingOutput} listeningSupported={learning.listeningSupported} voices={learning.voices} selectedVoice={learning.selectedVoice} onVoiceChange={learning.setSelectedVoice} speechRate={learning.speechRate} onSpeechRateChange={learning.setSpeechRate} handleSpeak={learning.handleSpeak} handleStop={learning.handleStop} isSpeaking={learning.isSpeaking} dictationText={learning.dictationText} onDictationChange={learning.setDictationText} dictationScore={learning.dictationScore} showAnswer={learning.showAnswer} onCheckDictation={learning.handleCheckDictation} onToggleAnswer={learning.handleToggleAnswer} key="listening" />,
    <SpeechStep
      speechText={learning.speechText}
      onSpeechTextChangeAction={learning.setSpeechText}
      speechError={learning.speechError}
      speechLoading={learning.speechLoading}
      handleAnalyzeSpeechAction={learning.handleAnalyzeSpeech}
      speechFeedback={learning.speechFeedback}
      cefrLevel={learning.cefrLevel}
      recordingSupported={learning.speechRecordingSupported}
      isRecording={learning.isSpeechRecording}
      remainingRecordingSeconds={learning.speechRecordingRemainingSeconds}
      recordingReady={learning.speechRecordingReady}
      recordingDurationMs={learning.speechRecordingDurationMs}
      recordedAudioUrl={learning.speechRecordingUrl}
      recordingError={learning.speechRecordingError}
      transcript={learning.speechRecordingTranscript}
      transcriptionLoading={learning.speechTranscriptionLoading}
      transcriptionError={learning.speechTranscriptionError}
      recordingLimitSeconds={learning.speechRecordingLimitSeconds}
      handleStartRecordingAction={learning.startSpeechRecording}
      handleStopRecordingAction={learning.stopSpeechRecording}
      handleResetRecordingAction={learning.resetSpeechRecording}
      handleTranscribeRecordingAction={learning.handleTranscribeSpeechRecording}
      handleUseTranscriptAction={learning.handleUseTranscriptFromRecording}
      key="speech"
    />,

    <SceneStep
      sceneSourceText={learning.sceneSourceText}
      scenePrompt={learning.scenePrompt}
      sceneLoading={learning.sceneLoading}
      sceneError={learning.sceneError}
      handleGenerateSceneAction={learning.handleGenerateScene}
      sceneImageUrl={learning.sceneImageUrl}
      manualModeActive={learning.manualModeActive}
      manualSceneImage={learning.manualSceneImage}
      onManualSceneImageUploadAction={learning.handleManualSceneImageUpload}
      onManualSceneImageDeleteAction={learning.handleManualSceneImageDelete}
      readingFallbackText={learning.readingOutput}
      key="scene"
    />,
    <RoleplayStep chatHistory={learning.chatHistory} chatError={learning.chatError} chatInput={learning.chatInput} onChatInputChange={learning.setChatInput} handleSendChat={learning.handleSendChat} chatLoading={learning.chatLoading} handleRequestFeedback={learning.handleRequestFeedback} feedbackLoading={learning.feedbackLoading} feedbackError={learning.feedbackError} feedbackMessage={learning.feedbackMessage} hasUserMessage={learning.hasUserMessage} key="roleplay" />,
  ];

  return (
    <div className="flex min-h-screen bg-[#1a1b26] text-[#a9b1d6] font-mono">
      <Sidebar
        weeks={learning.weeks}
        weeksLoading={learning.weeksLoading}
        weeksError={learning.weeksError}
        activeWeek={learning.activeWeek}
        weekFilesLoading={learning.weekFilesLoading}
        currentWeekKey={learning.currentWeekKey}
        onWeekSelectAction={handleWeekSelect}
        isOpen={sidebarOpen}
        onCloseAction={() => setSidebarOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          cefrLevel={learning.cefrLevel}
          onSettingsOpenAction={() => learning.setSettingsOpen(true)}
          onMenuOpenAction={() => setSidebarOpen(true)}
        />
        <StepNav activeStep={activeStep} onStepChange={setActiveStep} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="mb-6 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.35em] text-[#a9b1d6]">
            {DAY_OPTIONS.map((day) => {
              const isActive = learning.activeDay === day;
              const hasData = learning.availableDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => learning.selectDay(day)}
                  disabled={!learning.activeWeek}
                  className={`flex items-center gap-1 rounded-full border px-3 py-1 text-[10px] font-semibold tracking-[0.4em] transition focus:outline-none ${
                    isActive
                      ? "border-[#7aa2f7] bg-[#7aa2f7]/20 text-[#7aa2f7]"
                      : "border-[#24283b] bg-[#1b1f2f] text-[#a9b1d6] hover:border-[#7aa2f7]"
                  }`}
                >
                  {formatDayLabel(day)}
                  {hasData && (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-[#9ece6a]"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
          {learning.storageMetadata?.available === false && (
            <div className="mb-6 rounded border border-[#24283b] bg-[#141724] px-4 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.55)] sm:px-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1 text-[12px]">
                  <p className="uppercase tracking-[0.35em] text-[#5b647b]">Storage fallback</p>
                  <p className="text-[#e0af68]">
                    LocalStorage is active because {storageReasonCopy[learning.storageMetadata?.reason ?? "missing_config"]}.
                  </p>
                  <p className="text-[11px] text-[#a9b1d6]">
                    Pending filesystem path: <span className="text-[#7aa2f7]">{learning.storageMetadata?.path ?? "LEARNING_DATA_DIR"}</span>
                  </p>
                  <p className="text-[11px] text-[#9ece6a]">Regeneration honors data stored in this browser until the path is restored.</p>
                </div>
                <span className="rounded-full border border-[#24283b] bg-[#1f2335] px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-[#9ece6a]">
                  Manual mode
                </span>
              </div>
            </div>
          )}
          {stepPanels[activeStep - 1]}
        </main>
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[#24283b] bg-[#1f2335] px-3 sm:px-6 py-2 text-[10px] uppercase tracking-[0.4em] text-[#7aa2f7]">
          <span>Tokyo Night · Gemini Web</span>
          <span className="hidden sm:inline">
            status: {learning.manualModeActive ? "localstorage" : "synced"}
          </span>
          <span className="text-[#7aa2f7]">Step {activeStep}/7</span>
        </footer>
      </div>
        <SettingsPanel
          open={learning.settingsOpen}
          apiKey={learning.apiKey}
          cefrLevel={learning.cefrLevel}
          settingsMessage={learning.settingsMessage}
          onClose={() => learning.setSettingsOpen(false)}
          onApiKeyChange={learning.setApiKey}
          onCefrLevelChange={learning.setCefrLevel}
          onSave={learning.saveSettings}
          geminiModel={learning.geminiModel}
          onGeminiModelChange={learning.setGeminiModel}
          voices={learning.voices}
          voice={learning.voice}
          onVoiceChange={learning.setVoice}
        />
    </div>
  );
}
