"use client";

import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import { getCurrentWeekKey, parseTopicFromIdea, stripReadingHeader } from "../lib/constants";

type ReviewStage = "idle" | "loading" | "done";
type StatusSetter = Dispatch<SetStateAction<"idle" | "loading" | "ready">>;

type UseWeeksParams = {
  setIdeaResponse: Dispatch<SetStateAction<string>>;
  setTopicHeader: Dispatch<SetStateAction<string>>;
  setWordsOutput: Dispatch<SetStateAction<string>>;
  setWordsStatus: StatusSetter;
  setReadingOutput: Dispatch<SetStateAction<string>>;
  setReadingStatus: StatusSetter;
  setDerivedStage: Dispatch<SetStateAction<ReviewStage>>;
};

export const useWeeks = ({
  setIdeaResponse,
  setTopicHeader,
  setWordsOutput,
  setWordsStatus,
  setReadingOutput,
  setReadingStatus,
  setDerivedStage,
}: UseWeeksParams) => {
  const [weeks, setWeeks] = useState<string[]>([]);
  const [weeksLoading, setWeeksLoading] = useState(true);
  const [weeksError, setWeeksError] = useState("");
  const [activeWeek, setActiveWeek] = useState<string | null>(null);
  const [weekFilesLoading, setWeekFilesLoading] = useState(false);
  const currentWeekKey = useMemo(() => getCurrentWeekKey(), []);

  const loadWeekFiles = useCallback(
    async (week: string) => {
      setWeekFilesLoading(true);
      try {
        const encoded = encodeURIComponent(week);
        const res = await fetch(`/api/weeks/${encoded}/files`, { cache: "no-store" });
        if (!res.ok) {
          return;
        }
        const data = (await res.json()) as {
          topic: string | null;
          words: string | null;
          reading: string | null;
          feedback: string | null;
        };
        if (data.topic) {
          setIdeaResponse(data.topic);
          setTopicHeader(parseTopicFromIdea(data.topic));
          setWordsStatus("idle");
        }
        if (data.words) {
          setWordsOutput(data.words);
          setWordsStatus("ready");
        }
        if (data.reading) {
          setReadingOutput(stripReadingHeader(data.reading));
          setReadingStatus("ready");
          setDerivedStage("done");
        }
      } finally {
        setWeekFilesLoading(false);
      }
    },
    [
      setIdeaResponse,
      setTopicHeader,
      setWordsOutput,
      setWordsStatus,
      setReadingOutput,
      setReadingStatus,
      setDerivedStage,
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
        const data = (await response.json()) as { weeks?: string[] };
        if (cancelled) {
          return;
        }
        const fetchedWeeks = Array.isArray(data.weeks) ? data.weeks : [];
        setWeeks(fetchedWeeks);
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
    setActiveWeek,
    loadWeekFiles,
    currentWeekKey,
  };
};
