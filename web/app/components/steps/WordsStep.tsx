"use client";

import { useState } from "react";
import { WordsTable } from "../../lib/types";

type WordsStepProps = {
  wordsTable: WordsTable;
  wordsCount: number;
  handleRegenerateWords: () => void;
  handleAddWord: (newRow: string[]) => Promise<void>;
  handleEditWord: (rowIndex: number, updatedRow: string[]) => Promise<void>;
  handleDeleteWord: (rowIndex: number) => Promise<void>;
};

const emptyRow = (colCount: number): string[] => Array.from({ length: colCount }, () => "");

export const WordsStep = ({
  wordsTable,
  wordsCount,
  handleRegenerateWords,
  handleAddWord,
  handleEditWord,
  handleDeleteWord,
}: WordsStepProps) => {
  const colCount = wordsTable?.headers.length ?? 3;

  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [editingCells, setEditingCells] = useState<string[]>([]);
  const [addingRow, setAddingRow] = useState(false);
  const [newRowCells, setNewRowCells] = useState<string[]>(emptyRow(colCount));
  const [saving, setSaving] = useState(false);

  const startEdit = (rowIndex: number, row: string[]) => {
    setEditingRowIndex(rowIndex);
    setEditingCells([...row]);
    setAddingRow(false);
  };

  const cancelEdit = () => {
    setEditingRowIndex(null);
    setEditingCells([]);
  };

  const commitEdit = async () => {
    if (editingRowIndex === null) return;
    setSaving(true);
    await handleEditWord(editingRowIndex, editingCells);
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
    await handleAddWord(newRowCells);
    setSaving(false);
    setAddingRow(false);
    setNewRowCells(emptyRow(colCount));
  };

  const deleteRow = async (rowIndex: number) => {
    setSaving(true);
    await handleDeleteWord(rowIndex);
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
          <button
            type="button"
            onClick={handleRegenerateWords}
            className="rounded-full border border-[#24283b] px-3 py-1 text-[#7aa2f7] hover:border-[#7aa2f7] transition-colors"
            title="Regenerate words (g)"
          >
            g
          </button>
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
                      {row.map((cell, cellIndex) => (
                        <td
                          key={`${rowIndex}-${cellIndex}`}
                          className="border-b border-[#24283b] px-2 py-3 align-top text-[13px] text-[#cdd6f4]"
                        >
                          {cell}
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
    </section>
  );
};
