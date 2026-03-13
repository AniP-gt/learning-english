"use client";

import { useState } from "react";
import { WordsTable } from "../../lib/types";
import { FlashcardModal } from "../FlashcardModal";

type WordsStepProps = {
  wordsTable: WordsTable;
  wordsCount: number;
  handleRegenerateWordsAction: () => void;
  handleAddWordAction: (newRow: string[]) => Promise<void>;
  handleEditWordAction: (rowIndex: number, updatedRow: string[]) => Promise<void>;
  handleDeleteWordAction: (rowIndex: number) => Promise<void>;
  manualModeActive: boolean;
  manualMarkdown: string;
  manualWordsRowCount: number;
  manualImportReady: boolean;
  onManualMarkdownChangeAction: (value: string) => void;
  onManualWordsImportAction: () => void;
};

const emptyRow = (colCount: number): string[] => Array.from({ length: colCount }, () => "");
const manualTableExample = `| Word | POS | Meaning | Example |
| --- | --- | --- | --- |
| travel | verb | 旅する | I travel between cities. |`;
const manualTablePlaceholder = "| Word | POS | Meaning | Example |";

export const WordsStep = ({
  wordsTable,
  wordsCount,
  handleRegenerateWordsAction,
  handleAddWordAction,
  handleEditWordAction,
  handleDeleteWordAction,
  manualModeActive,
  manualMarkdown,
  manualWordsRowCount,
  manualImportReady,
  onManualMarkdownChangeAction,
  onManualWordsImportAction,
}: WordsStepProps) => {
  const colCount = wordsTable?.headers.length ?? 3;

  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [editingCells, setEditingCells] = useState<string[]>([]);
  const [addingRow, setAddingRow] = useState(false);
  const [newRowCells, setNewRowCells] = useState<string[]>(emptyRow(colCount));
  const [saving, setSaving] = useState(false);
  const [flashcardOpen, setFlashcardOpen] = useState(false);

  const flashcards = wordsTable
    ? wordsTable.rows.map((row) => ({
        word: row[0] ?? "",
        translation: row[1] ?? "",
        example: row[2] ?? "",
      })).filter((c) => c.word && c.translation)
    : [];

  const startEdit = (rowIndex: number, row: string[]) => {
    setEditingRowIndex(rowIndex);
    // Pad the editing cells so we always show inputs for all headers
    const padded = [...row];
    while (padded.length < colCount) padded.push("");
    setEditingCells(padded);
    setAddingRow(false);
  };

  const cancelEdit = () => {
    setEditingRowIndex(null);
    setEditingCells([]);
  };

  const commitEdit = async () => {
    if (editingRowIndex === null) return;
    setSaving(true);
    await handleEditWordAction(editingRowIndex, editingCells);
    setSaving(false);
    setEditingRowIndex(null);
    setEditingCells([]);
  };

  const startAdd = () => {
    setAddingRow(true);
    setNewRowCells(emptyRow(colCount));
    setEditingRowIndex(null);
    setEditingCells([]);
  };

  const cancelAdd = () => {
    setAddingRow(false);
    setNewRowCells(emptyRow(colCount));
  };

  const commitAdd = async () => {
    if (newRowCells.every((c) => c.trim() === "")) return;
    setSaving(true);
    await handleAddWordAction(newRowCells);
    setSaving(false);
    setAddingRow(false);
    setNewRowCells(emptyRow(colCount));
  };

  const deleteRow = async (rowIndex: number) => {
    setSaving(true);
    await handleDeleteWordAction(rowIndex);
    setSaving(false);
    if (editingRowIndex === rowIndex) cancelEdit();
  };

  const inputClass =
    "w-full bg-[#1a1b26] border border-[#7aa2f7] rounded px-1.5 py-1 text-[13px] text-[#cdd6f4] outline-none focus:border-[#9ece6a] min-w-0";

  return (
    <section className="space-y-6 step-section">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.4em] text-[#5b647b]">Step 2 · Words</p>
          <h2 className="text-2xl font-bold text-[#9ece6a] sm:text-3xl">Vocabulary Table</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-[#24283b] bg-[#1f2335] px-3 py-1 text-[#c0caf5]">
            Count: {wordsCount}
          </span>
          {!manualModeActive && (
            <button
              type="button"
              onClick={handleRegenerateWordsAction}
              className="rounded-full border border-[#24283b] px-3 py-1 text-[#7aa2f7] hover:border-[#7aa2f7] transition-colors"
              title="Regenerate words (g)"
            >
              g
            </button>
          )}
          {wordsTable && flashcards.length > 0 && (
            <button
              type="button"
              onClick={() => setFlashcardOpen(true)}
              className="rounded-full border border-[#24283b] px-3 py-1 text-[#e0af68] hover:border-[#e0af68] transition-colors"
              title="Flashcard mode (f)"
            >
              flashcard
            </button>
          )}
          {wordsTable && (
            <button
              type="button"
              onClick={startAdd}
              disabled={addingRow || saving}
              className="rounded-full border border-[#24283b] px-3 py-1 text-[#9ece6a] hover:border-[#9ece6a] transition-colors disabled:opacity-40"
              title="Add new word"
            >
              + add
            </button>
          )}
        </div>
      </div>

      {manualModeActive && (
        <div className="space-y-3 rounded border border-[#24283b] bg-[#141724] p-4 text-sm text-[#cdd6f4]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-[#5b647b]">Manual import</p>
              <p className="text-[11px] text-[#7aa2f7]">Paste a markdown table and convert to the vocabulary grid.</p>
            </div>
            <span className="text-[11px] text-[#9ece6a]">{manualWordsRowCount} rows parsed</span>
          </div>
          <div className="space-y-2 rounded border border-[#24283b] bg-[#0f111a] px-3 py-3 text-[11px] text-[#a9b1d6]">
            <p className="uppercase tracking-[0.35em] text-[#5b647b]">Manual table hints</p>
            <p>Provide a header row, the separator row (| --- |), and at least one data row to populate the grid.</p>
            <pre className="whitespace-pre-wrap rounded border border-[#24283b] bg-[#121422] px-3 py-2 text-[11px] font-mono text-[#7aa2f7]">
{manualTableExample}
            </pre>
          </div>
          <textarea
            value={manualMarkdown}
            onChange={(event) => onManualMarkdownChangeAction(event.target.value)}
            placeholder={manualTablePlaceholder}
            rows={6}
            className="w-full rounded border border-[#24283b] bg-[#0f111a] p-3 text-[13px] leading-relaxed text-[#cdd6f4] placeholder-[#3b4261] resize-y focus:border-[#7aa2f7] focus:outline-none"
          />
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onManualWordsImportAction}
              disabled={!manualImportReady}
              className="rounded-full border border-[#24283b] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.4em] text-[#9ece6a] disabled:opacity-40"
            >
              Convert to table
            </button>
            {manualMarkdown && !manualImportReady && (
              <p className="text-[11px] text-[#f7768e]">Tables require headers, a separator line, and at least one row.</p>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded border border-[#24283b] bg-[#141724] p-4">
        {wordsTable ? (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-[0.3em] text-[#5b647b]">
                {wordsTable.headers.map((header) => (
                  <th key={header} className="border-b border-[#24283b] pb-2 text-left">
                    {header}
                  </th>
                ))}
                <th className="border-b border-[#24283b] pb-2 text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {wordsTable.rows.map((row, rowIndex) => (
                <tr
                  key={`row-${rowIndex}`}
                  className={rowIndex % 2 === 0 ? "bg-[#16161e]" : "bg-[#141724]"}
                >
                  {editingRowIndex === rowIndex ? (
                    <>
                      {editingCells.map((cell, cellIndex) => (
                        <td
                          key={`edit-${rowIndex}-${cellIndex}`}
                          className="border-b border-[#24283b] px-2 py-2 align-top"
                        >
                          <input
                            className={inputClass}
                            value={cell}
                            onChange={(e) => {
                              const next = [...editingCells];
                              next[cellIndex] = e.target.value;
                              setEditingCells(next);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void commitEdit();
                              if (e.key === "Escape") cancelEdit();
                            }}
                            autoFocus={cellIndex === 0}
                          />
                        </td>
                      ))}
                      <td className="border-b border-[#24283b] px-2 py-2 align-top text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => void commitEdit()}
                            disabled={saving}
                            className="rounded px-2 py-0.5 text-[11px] text-[#9ece6a] border border-[#9ece6a] hover:bg-[#9ece6a]/10 disabled:opacity-40"
                          >
                            save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="rounded px-2 py-0.5 text-[11px] text-[#5b647b] border border-[#24283b] hover:border-[#5b647b]"
                          >
                            cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      {Array.from({ length: colCount }).map((_, cellIndex) => (
                        <td
                          key={`${rowIndex}-${cellIndex}`}
                          className="border-b border-[#24283b] px-2 py-3 align-top text-[13px] text-[#cdd6f4]"
                        >
                          {row[cellIndex] ?? ""}
                        </td>
                      ))}
                      <td className="border-b border-[#24283b] px-2 py-3 align-top text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(rowIndex, row)}
                            disabled={saving || addingRow}
                            className="rounded px-2 py-0.5 text-[11px] text-[#7aa2f7] border border-[#24283b] hover:border-[#7aa2f7] disabled:opacity-40"
                          >
                            edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteRow(rowIndex)}
                            disabled={saving}
                            className="rounded px-2 py-0.5 text-[11px] text-[#f7768e] border border-[#24283b] hover:border-[#f7768e] disabled:opacity-40"
                          >
                            del
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}

              {addingRow && (
                <tr className="bg-[#1a1b26] border border-dashed border-[#9ece6a]/40">
                  {newRowCells.map((cell, cellIndex) => (
                    <td
                      key={`new-${cellIndex}`}
                      className="border-b border-[#24283b] px-2 py-2 align-top"
                    >
                      <input
                        className={inputClass}
                        value={cell}
                        placeholder={wordsTable.headers[cellIndex] ?? ""}
                        onChange={(e) => {
                          const next = [...newRowCells];
                          next[cellIndex] = e.target.value;
                          setNewRowCells(next);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void commitAdd();
                          if (e.key === "Escape") cancelAdd();
                        }}
                        autoFocus={cellIndex === 0}
                      />
                    </td>
                  ))}
                  <td className="border-b border-[#24283b] px-2 py-2 align-top text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => void commitAdd()}
                        disabled={saving}
                        className="rounded px-2 py-0.5 text-[11px] text-[#9ece6a] border border-[#9ece6a] hover:bg-[#9ece6a]/10 disabled:opacity-40"
                      >
                        save
                      </button>
                      <button
                        type="button"
                        onClick={cancelAdd}
                        className="rounded px-2 py-0.5 text-[11px] text-[#5b647b] border border-[#24283b] hover:border-[#5b647b]"
                      >
                        cancel
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <div className="text-[13px] text-[#5b647b]">
            Words will appear here after the idea step completes.
          </div>
        )}
      </div>
      {flashcardOpen && flashcards.length > 0 && (
        <FlashcardModal cards={flashcards} onClose={() => setFlashcardOpen(false)} />
      )}
    </section>
  );
};
