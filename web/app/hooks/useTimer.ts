"use client";

import { Dispatch, SetStateAction, useCallback, useEffect, useState } from "react";

type UseTimerParams = {
  readingOutput: string;
  readingWordCount: number;
  setErrorMessage: Dispatch<SetStateAction<string>>;
};

export const useTimer = ({ readingOutput, readingWordCount, setErrorMessage }: UseTimerParams) => {
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTiming, setIsTiming] = useState(false);
  const [wpmResult, setWpmResult] = useState<number | null>(null);

  useEffect(() => {
    if (!isTiming) {
      return;
    }
    const interval = setInterval(() => {
      setTimerSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isTiming]);

  const handleStartTimer = useCallback(() => {
    if (!readingOutput) {
      setErrorMessage("先にReadingを生成してください。");
      return;
    }
    setErrorMessage("");
    setTimerSeconds(0);
    setWpmResult(null);
    setIsTiming(true);
  }, [readingOutput, setErrorMessage]);

  const resetTimer = useCallback(() => {
    setIsTiming(false);
    setTimerSeconds(0);
    setWpmResult(null);
  }, []);

  const handleStopTimer = useCallback(() => {
    setIsTiming(false);
    const minutes = timerSeconds / 60;
    if (minutes <= 0) {
      setWpmResult(readingWordCount || 0);
      return;
    }
    setWpmResult(Math.round(readingWordCount / minutes));
  }, [readingWordCount, timerSeconds]);

  return { timerSeconds, isTiming, wpmResult, handleStartTimer, handleStopTimer, resetTimer };
};
