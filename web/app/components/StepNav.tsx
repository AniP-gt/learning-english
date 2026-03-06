"use client";

import { indicatorWidth, steps } from "../lib/constants";

type StepNavProps = {
  activeStep: number;
  onStepChange: (step: number) => void;
};

export const StepNav = ({ activeStep, onStepChange }: StepNavProps) => (
  <nav className="relative flex border-b border-[#24283b] bg-[#16161e] p-1">
    {steps.map((step) => (
      <button
        key={step.id}
        type="button"
        onClick={() => onStepChange(step.id)}
        className={`relative z-10 flex-1 rounded px-3 py-2 text-[10px] uppercase tracking-[0.3em] transition ${
          activeStep === step.id
            ? "bg-[#7aa2f7] text-[#1a1b26] shadow-[0_5px_20px_rgba(122,162,247,0.5)]"
            : "text-[#5b647b] hover:bg-[#24283b]"
        }`}
      >
        <span className="hidden sm:inline">{step.title}</span>
        <span className="sm:hidden">{step.id}</span>
      </button>
    ))}
    <div
      className="tab-indicator"
      style={{
        left: `${indicatorWidth * (activeStep - 1)}%`,
        width: `${indicatorWidth}%`,
      }}
    />
  </nav>
);
