import { useId, useRef, useState } from 'react';
import { useCitySuggestions } from '../../hooks/useCities';
import { cn } from '../../lib/utils';
import Skeleton from './Skeleton';

export interface CitySearchInputProps {
  placeholder?: string;
  initialValue?: string;
  onSelectCity: (city: string) => void;
  className?: string;
  size?: 'md' | 'compact';
}

/** Поле «Введите город» с автодополнением (F2) — docs/02-ux.md, главный экран + шапка. */
export function CitySearchInput({
  placeholder = 'Введите город',
  initialValue = '',
  onSelectCity,
  className,
  size = 'md',
}: CitySearchInputProps) {
  const [value, setValue] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const { suggestions, isLoading, error } = useCitySuggestions(value);
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const visibleSuggestions = suggestions.slice(0, 5);
  const showDropdown = isFocused && value.trim().length > 0;

  const commit = (city: string) => {
    setValue(city);
    setIsFocused(false);
    setHighlightedIndex(-1);
    onSelectCity(city);
    inputRef.current?.blur();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, visibleSuggestions.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, -1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const chosen = highlightedIndex >= 0 ? visibleSuggestions[highlightedIndex] : value.trim();
      if (chosen) commit(chosen);
    } else if (event.key === 'Escape') {
      setIsFocused(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div className={cn('relative', className)}>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setHighlightedIndex(-1);
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 120)}
        onKeyDown={handleKeyDown}
        className={cn(
          'focus-ring w-full rounded-md border border-border-strong bg-surface text-text-primary placeholder:text-text-disabled',
          size === 'compact' ? 'h-9 px-3 text-sm' : 'h-12 px-4 text-base',
        )}
      />
      {showDropdown ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-surface-elevated shadow-md"
        >
          {isLoading ? (
            <li className="flex flex-col gap-2 p-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
            </li>
          ) : error ? (
            <li className="p-3 text-sm text-text-secondary">{error}</li>
          ) : visibleSuggestions.length > 0 ? (
            visibleSuggestions.map((city, index) => (
              <li key={city} role="option" aria-selected={index === highlightedIndex}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => commit(city)}
                  className={cn(
                    'block w-full border-b border-border px-4 py-2.5 text-left text-sm text-text-primary last:border-b-0 hover:bg-surface-hover',
                    index === highlightedIndex ? 'bg-surface-hover' : '',
                  )}
                >
                  {city}
                </button>
              </li>
            ))
          ) : (
            <li className="p-3 text-sm text-text-secondary">Начните вводить название города</li>
          )}
        </ul>
      ) : null}
    </div>
  );
}

export default CitySearchInput;
