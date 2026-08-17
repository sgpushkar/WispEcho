"use client";

import { useState } from "react";
import { X, Plus, BarChart2 } from "lucide-react";

interface PollCreatorProps {
  onClose: () => void;
  onSubmit: (question: string, options: string[]) => void;
}

export function PollCreator({ onClose, onSubmit }: PollCreatorProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const handleAddOption = () => {
    if (options.length < 10) setOptions([...options, ""]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleChangeOption = (index: number, val: string) => {
    const newOptions = [...options];
    newOptions[index] = val;
    setOptions(newOptions);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = options.map(o => o.trim()).filter(o => o.length > 0);
    if (!question.trim() || validOptions.length < 2) return;
    onSubmit(question.trim(), validOptions);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl">
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-2">
            <BarChart2 size={18} className="text-accent" />
            <h3 className="font-semibold text-white">Create Poll</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition text-white/50 hover:text-white">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
          <div>
            <label className="text-xs text-white/50 mb-1 block">Question</label>
            <input
              type="text"
              placeholder="Ask a question..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent text-sm"
              autoFocus
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-xs text-white/50 mb-1 block">Options</label>
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`Option ${i + 1}`}
                  value={opt}
                  onChange={(e) => handleChangeOption(i, e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent text-sm"
                />
                {options.length > 2 && (
                  <button type="button" onClick={() => handleRemoveOption(i)} className="text-red-400 hover:text-red-300 p-2">
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
            {options.length < 10 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="flex items-center gap-2 text-accent text-sm py-2 px-1 hover:text-accent/80 transition"
              >
                <Plus size={16} />
                <span>Add Option</span>
              </button>
            )}
          </div>
          
          <div className="pt-2">
            <button
              type="submit"
              disabled={!question.trim() || options.filter(o => o.trim()).length < 2}
              className="w-full bg-accent text-white rounded-lg py-2.5 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition hover:bg-accent/90"
            >
              Send Poll
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
