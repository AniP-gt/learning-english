"use client";

import { WordsTable } from "../../lib/types";

type WordsStepProps = {
  wordsTable: WordsTable;
  wordsCount: number;
  handleRegenerateWords: () => void;
};

export const WordsStep = ({ wordsTable, wordsCount, handleRegenerateWords }: WordsStepProps) => (
  <section className="space-y-6 step-section">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-[#5b647b]">Step 2 · Words</p>
        <h2 className="text-3xl font-bold text-[#9ece6a]">Vocabulary Table</h2>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="rounded-full border border-[#24283b] bg-[#1f2335] px-3 py-1 text-[#c0caf5]">Count: {wordsCount}</span>
        <button
          type="button"
          onClick={handleRegenerateWords}
          className="rounded-full border border-[#24283b] px-3 py-1 text-[#7aa2f7]"
        >
          g
        </button>
      </div>
    </div>

    <div className="overflow-hidden rounded border border-[#24283b] bg-[#141724] p-4">
      {wordsTable ? (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.3em] text-[#5b647b]">
              {wordsTable.headers.map((header) => (
                <th key={header} className="border-b border-[#24283b] pb-2 text-left">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {wordsTable.rows.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`} className={rowIndex % 2 === 0 ? "bg-[#16161e]" : "bg-[#141724]"}>
                {row.map((cell, cellIndex) => (
                  <td key={`${rowIndex}-${cellIndex}`} className="border-b border-[#24283b] px-2 py-3 align-top text-[13px] text-[#cdd6f4]">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="text-[13px] text-[#5b647b]">
          Words will appear here after the idea step completes.
        </div>
      )}
    </div>
  </section>
);
