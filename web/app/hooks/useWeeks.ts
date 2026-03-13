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
};

export const useWeeks = ({
  setIdeaResponseAction,
  setTopicHeaderAction,
  setWordsOutputAction,
  setWordsStatusAction,
  setReadingOutputAction,
  setReadingStatusAction,
  setDerivedStageAction,
}: UseWeeksParams) => {
  const [weeks, setWeeks] = useState<string[]>([]);
  const [weeksLoading, setWeeksLoading] = useState(true);
  const [weeksError, setWeeksError] = useState("");
  const [activeWeek, setActiveWeek] = useState<string | null>(null);
  const [weekFilesLoading, setWeekFilesLoading] = useState(false);
  const [storageMetadata, setStorageMetadata] = useState<StorageMetadata | null>(null);
  const currentWeekKey = useMemo(() => getCurrentWeekKey(), []);

  const loadWeekFiles = useCallback(
    async (week: string) => {
      setWeekFilesLoading(true);
      try {
        const encoded = encodeURIComponent(week);
        const res = await fetch(`/api/weeks/${encoded}/files`, { cache: "no-store" });
        let data: {
          topic: string | null;
          words: string | null;
          reading: string | null;
          feedback: string | null;
          storage?: StorageMetadata;
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
        if (data.topic) {
          setIdeaResponseAction(data.topic);
          setTopicHeaderAction(parseTopicFromIdea(data.topic));
          setWordsStatusAction("idle");
        }
        if (data.words) {
          setWordsOutputAction(data.words);
          setWordsStatusAction("ready");
        }
        if (data.reading) {
          setReadingOutputAction(stripReadingHeader(data.reading));
          setReadingStatusAction("ready");
          setDerivedStageAction("done");
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
          void loadWeekFiles(initialWeek);
        }
      } catch (error) {
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

  return {
    weeks,
    weeksLoading,
    weeksError,
    activeWeek,
    weekFilesLoading,
    storageMetadata,
    setActiveWeek,
    loadWeekFiles,
    currentWeekKey,
  };
};
