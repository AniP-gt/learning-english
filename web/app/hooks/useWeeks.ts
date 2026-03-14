"use client";

import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import { getCurrentWeekKey, parseTopicFromIdea, stripReadingHeader } from "../lib/constants";
import { StorageMetadata } from "../lib/types";

type WeeksApiResponse = {
  weeks?: string[];
  storage?: StorageMetadata;
};

type ReviewStage = "idle" | "loading" | "done";
type StatusSetter = Dispatch<SetStateAction<"idle" | "loading" | "ready">>;

type UseWeeksParams = {
  setIdeaResponseAction: Dispatch<SetStateAction<string>>;
  setTopicHeaderAction: Dispatch<SetStateAction<string>>;
  setWordsOutputAction: Dispatch<SetStateAction<string>>;
  setWordsStatusAction: StatusSetter;
  setReadingOutputAction: Dispatch<SetStateAction<string>>;
  setReadingStatusAction: StatusSetter;
  setDerivedStageAction: Dispatch<SetStateAction<ReviewStage>>;
  setSpeechFeedbackAction: Dispatch<SetStateAction<string>>;
  setSpeechTranscriptAction: Dispatch<SetStateAction<string>>;
  setSpeechTextAction: Dispatch<SetStateAction<string>>;
  setSpeechAudioUrlAction: Dispatch<SetStateAction<string | null>>;
  setWeekImageUrlAction: Dispatch<SetStateAction<string>>;
};

export const useWeeks = ({
  setIdeaResponseAction,
  setTopicHeaderAction,
  setWordsOutputAction,
  setWordsStatusAction,
  setReadingOutputAction,
  setReadingStatusAction,
  setDerivedStageAction,
  setSpeechFeedbackAction,
  setSpeechTranscriptAction,
  setSpeechTextAction,
  setSpeechAudioUrlAction,
  setWeekImageUrlAction,
}: UseWeeksParams) => {
  const [weeks, setWeeks] = useState<string[]>([]);
  const [weeksLoading, setWeeksLoading] = useState(true);
  const [weeksError, setWeeksError] = useState("");
  const [activeWeek, setActiveWeek] = useState<string | null>(null);
  const [weekFilesLoading, setWeekFilesLoading] = useState(false);
  const [storageMetadata, setStorageMetadata] = useState<StorageMetadata | null>(null);
  const DEFAULT_DAY = "day1";
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [activeDay, setActiveDay] = useState<string>(DEFAULT_DAY);
  const currentWeekKey = useMemo(() => getCurrentWeekKey(), []);

  const loadWeekFiles = useCallback(
    async (week: string, requestedDay = DEFAULT_DAY) => {
      setWeekFilesLoading(true);
      setWeekImageUrlAction("");
      try {
        const encoded = encodeURIComponent(week);
        const query = new URLSearchParams();
        if (requestedDay) {
          query.set("day", requestedDay);
        }
        const res = await fetch(
          `/api/weeks/${encoded}/files${query.toString() ? `?${query.toString()}` : ""}`,
          { cache: "no-store" }
        );
        let data: {
          topic: string | null;
          words: string | null;
          reading: string | null;
          feedback: string | null;
          imageUrl?: string;
          storage?: StorageMetadata;
          availableDays?: string[];
          activeDay?: string;
          dayFiles?: {
            reading?: string | null;
            feedback?: string | null;
            speechTranscript?: string | null;
            speechAudioUrl?: string | null;
          } | null;
        } = { topic: null, words: null, reading: null, feedback: null };
        try {
          data = (await res.json()) as typeof data;
        } catch {
        }
        if (data.storage) {
          setStorageMetadata(data.storage);
        }
        if (!res.ok) {
          return;
        }
        const fetchedDays = Array.isArray(data.availableDays) ? data.availableDays : [];
        setAvailableDays(fetchedDays);
        const resolvedDay = data.activeDay ?? requestedDay;
        if (resolvedDay) {
          setActiveDay(resolvedDay);
        }
        setWeekImageUrlAction(data.imageUrl ?? "");
        if (data.topic) {
          setIdeaResponseAction(data.topic);
          setTopicHeaderAction(parseTopicFromIdea(data.topic));
          setWordsStatusAction("idle");
        }
        if (data.words) {
          setWordsOutputAction(data.words);
          setWordsStatusAction("ready");
        }
        const dailyReading = data.dayFiles?.reading;
        const dailyFeedback = data.dayFiles?.feedback ?? "";
        const dailyTranscript = data.dayFiles?.speechTranscript?.trim() ?? "";
        setSpeechFeedbackAction(dailyFeedback);
        setSpeechTranscriptAction(dailyTranscript);
        setSpeechTextAction(dailyTranscript);
        setSpeechAudioUrlAction(data.dayFiles?.speechAudioUrl ?? null);
        if (dailyReading) {
          setReadingOutputAction(stripReadingHeader(dailyReading));
          setReadingStatusAction("ready");
          setDerivedStageAction("done");
        } else {
          setReadingOutputAction("");
          setReadingStatusAction("idle");
          setDerivedStageAction("idle");
        }
      } finally {
        setWeekFilesLoading(false);
      }
    },
      [
        setIdeaResponseAction,
        setStorageMetadata,
        setTopicHeaderAction,
        setWordsOutputAction,
        setWordsStatusAction,
        setReadingOutputAction,
        setReadingStatusAction,
        setDerivedStageAction,
        setSpeechFeedbackAction,
        setSpeechTranscriptAction,
        setSpeechTextAction,
        setSpeechAudioUrlAction,
        setWeekImageUrlAction,
      ]
    );

  useEffect(() => {
    let cancelled = false;
    const fetchWeeks = async () => {
      setWeeksError("");
      try {
        const response = await fetch("/api/weeks", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Unable to fetch weeks");
        }
        const data = (await response.json()) as WeeksApiResponse;
        if (cancelled) {
          return;
        }
        const fetchedWeeks = Array.isArray(data.weeks) ? data.weeks : [];
        setWeeks(fetchedWeeks);
        setStorageMetadata(
          data.storage ?? {
            available: false,
            source: "localStorage",
          }
        );
        let initialWeek: string | null = null;
        if (fetchedWeeks.includes(currentWeekKey)) {
          initialWeek = currentWeekKey;
        } else if (fetchedWeeks.length > 0) {
          initialWeek = fetchedWeeks[0];
        }
        if (initialWeek) {
          setActiveWeek(initialWeek);
          void loadWeekFiles(initialWeek, DEFAULT_DAY);
        }
      } catch {
        if (cancelled) {
          return;
        }
        setWeeksError("Unable to load weekly history.");
      } finally {
        if (!cancelled) {
          setWeeksLoading(false);
        }
      }
    };
    void fetchWeeks();
    return () => {
      cancelled = true;
    };
  }, [currentWeekKey, loadWeekFiles]);

  const selectDay = useCallback(
    (day: string) => {
      if (!activeWeek) {
        return;
      }
      setActiveDay(day);
      void loadWeekFiles(activeWeek, day);
    },
    [activeWeek, loadWeekFiles]
  );

  return {
    weeks,
    weeksLoading,
    weeksError,
    activeWeek,
    weekFilesLoading,
    storageMetadata,
    availableDays,
    activeDay,
    setActiveWeek,
    loadWeekFiles,
    selectDay,
    currentWeekKey,
  };
};
