import { useEffect, useId, useRef, useTransition } from 'react';
import type { SearchInputProps } from './types';

/**
 * Accessible diagnostic search input with debounced resolution and WAI-ARIA 1.2 Combobox semantics.
 */
export function SearchInput({
  value,
  onChange,
  onDebouncedChange,
  debounceMs = 250,
  onClear,
  onKeyDown,
  placeholder = 'Search diagnostic test (e.g., CBC, Lipid Profile, USG, CT Scan)',
  isLoading = false,
  isExpanded = false,
  ariaControls,
  ariaActiveDescendant,
  ariaLabel = 'Search diagnostic tests',
  inputRef,
  id,
  announcement = '',
  disabled = false,
  autoFocus = false,
  endAdornment,
}: SearchInputProps) {
  const generatedId = useId();
  const inputId = id ?? `medimap-search-input-${generatedId}`;
  const internalInputRef = useRef<HTMLInputElement | null>(null);
  const activeInputRef = inputRef ?? internalInputRef;

  const [isPending, startTransition] = useTransition();
  const debouncedChangeRef = useRef(onDebouncedChange);
  useEffect(() => {
    debouncedChangeRef.current = onDebouncedChange;
  }, [onDebouncedChange]);

  // Debounce notification with cancellation and transition wrapping
  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        debouncedChangeRef.current?.(value);
      });
    }, debounceMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, debounceMs]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else {
      onChange('');
    }
    activeInputRef.current?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (onKeyDown) {
      onKeyDown(event);
    }
  };

  return (
    <div className="medimap-search-input-wrapper">
      <div className="medimap-search-input-box">
        <span className="medimap-search-leading-icon" aria-hidden="true">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>

        <input
          ref={activeInputRef}
          id={inputId}
          type="search"
          role="combobox"
          aria-expanded={isExpanded}
          aria-haspopup="listbox"
          aria-controls={ariaControls}
          aria-autocomplete="list"
          aria-activedescendant={ariaActiveDescendant || undefined}
          aria-label={ariaLabel}
          aria-busy={isLoading || isPending}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="medimap-search-input"
        />

        {isLoading || isPending ? (
          <span className="medimap-search-spinner" aria-hidden="true" title="Resolving query">
            <svg
              className="medimap-animate-spin"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </span>
        ) : null}

        {value.length > 0 && !disabled ? (
          <button
            type="button"
            className="medimap-search-clear-btn"
            aria-label="Clear search input"
            onClick={handleClear}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        ) : null}

        {endAdornment}
      </div>

      {/* Screen reader live announcement region */}
      <div
        id={`${inputId}-live`}
        className="medimap-sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </div>
    </div>
  );
}
