import React, { useState, useMemo } from 'react';
import { Hash, Plus, X } from 'lucide-react';
import { cn, normalizeTag, SUGGESTED_TAGS } from '../lib/utils';

interface TagManagerInputProps {
  tags: string[];
  onChange: (newTags: string[]) => void;
  existingTags?: string[];
  compact?: boolean;
}

export default function TagManagerInput({
  tags,
  onChange,
  existingTags = [],
  compact = false,
}: TagManagerInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addTag = (raw: string) => {
    const cleaned = normalizeTag(raw);
    if (!cleaned) return;
    if (tags.length >= 20) return;

    const alreadyExists = tags.some(
      (t) => t.toLowerCase() === cleaned.toLowerCase()
    );
    if (!alreadyExists) {
      onChange([...tags, cleaned]);
    }
    setInputValue('');
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((t) => t !== tagToRemove));
  };

  const toggleTag = (tag: string) => {
    const existingMatch = tags.find(
      (t) => t.toLowerCase() === tag.toLowerCase()
    );
    if (existingMatch) {
      removeTag(existingMatch);
    } else {
      if (tags.length >= 20) return;
      onChange([...tags, tag]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  // Combine user's existing custom tags across tasks with suggested starter tags
  const quickPickTags = useMemo(() => {
    const seen = new Set<string>();
    const combined: string[] = [];

    for (const t of existingTags) {
      const norm = normalizeTag(t);
      if (norm && !seen.has(norm.toLowerCase())) {
        seen.add(norm.toLowerCase());
        combined.push(norm);
      }
    }

    for (const s of SUGGESTED_TAGS) {
      if (!seen.has(s.toLowerCase())) {
        seen.add(s.toLowerCase());
        combined.push(s);
      }
    }

    return combined.slice(0, 14);
  }, [existingTags]);

  return (
    <div className="space-y-2.5">
      {/* Header row with label and clear action */}
      <div className="flex items-center justify-between">
        <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400">
          Custom Tags &amp; Labels {tags.length > 0 && `(${tags.length}/20)`}
        </label>
        {tags.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[10px] font-semibold text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Selected tags + text input box */}
      <div
        className={cn(
          "bg-neutral-50 border border-neutral-200 rounded-2xl p-2.5 focus-within:border-neutral-900 focus-within:bg-white transition-all",
          compact && "p-2"
        )}
      >
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-900 text-white text-xs font-semibold"
              >
                <Hash size={11} className="text-neutral-400 shrink-0" />
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-0.5 text-neutral-400 hover:text-white rounded-xs p-0.5 transition-colors"
                  aria-label={`Remove tag ${tag}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Hash size={15} className="text-neutral-400 ml-1 shrink-0" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              tags.length >= 20
                ? "Maximum 20 tags reached"
                : "Type a custom tag and press Enter..."
            }
            disabled={tags.length >= 20}
            maxLength={30}
            className="flex-1 bg-transparent text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none py-1"
          />
          <button
            type="button"
            onClick={() => addTag(inputValue)}
            disabled={!normalizeTag(inputValue) || tags.length >= 20}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-neutral-900 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 transition-colors shrink-0"
          >
            <Plus size={13} />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Quick-pick existing & suggested tags */}
      {quickPickTags.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-neutral-400 block">
            Quick toggle tags:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {quickPickTags.map((tag) => {
              const isSelected = tags.some(
                (t) => t.toLowerCase() === tag.toLowerCase()
              );
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all flex items-center gap-1",
                    isSelected
                      ? "bg-neutral-900 text-white border-neutral-900 shadow-2xs"
                      : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400 hover:text-neutral-900"
                  )}
                >
                  <span className={cn("text-[10px]", isSelected ? "text-neutral-400" : "text-neutral-400")}>#</span>
                  <span>{tag}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
