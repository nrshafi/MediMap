import { useEffect, useRef } from 'react';
import type { AutoSuggestDropdownProps, SuggestionItem } from './types';

/**
 * Accessible listbox dropdown presenting diagnostic suggestions and typo alternatives.
 */
export function AutoSuggestDropdown({
  id,
  isOpen,
  items,
  activeIndex,
  onSelect,
  query,
  isLoading = false,
  emptyMessage,
}: AutoSuggestDropdownProps) {
  const listboxRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll active item into visible listbox view
  useEffect(() => {
    if (!isOpen || activeIndex < 0 || !listboxRef.current) {
      return;
    }
    const activeElement = listboxRef.current.querySelector<HTMLElement>(
      `[data-option-index="${activeIndex}"]`,
    );
    if (activeElement) {
      activeElement.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, isOpen]);

  if (!isOpen) {
    return null;
  }

  const trimmedQuery = query.trim();

  return (
    <div
      ref={listboxRef}
      id={id}
      role="listbox"
      aria-label="Diagnostic test suggestions"
      className="medimap-dropdown-panel"
    >
      {isLoading ? (
        <div className="medimap-dropdown-status" role="status">
          Searching diagnostic catalog...
        </div>
      ) : items.length === 0 ? (
        trimmedQuery.length > 0 ? (
          <div className="medimap-dropdown-status medimap-dropdown-empty" role="status">
            {emptyMessage ?? (
              <span>No diagnostic tests found for &ldquo;{trimmedQuery}&rdquo;</span>
            )}
          </div>
        ) : null
      ) : (
        <div className="medimap-dropdown-list">
          {items.map((item: SuggestionItem, index: number) => {
            const isSelected = index === activeIndex;
            const optionId = `${id}-opt-${index}`;
            const isTypo = item.kind === 'typo_suggestion';

            return (
              <div
                key={item.id}
                id={optionId}
                role="option"
                aria-selected={isSelected}
                data-option-index={index}
                className={`medimap-dropdown-option ${
                  isSelected ? 'medimap-option-selected' : ''
                } ${isTypo ? 'medimap-option-typo' : ''}`}
                onClick={() => onSelect(item)}
                onMouseDown={(e) => {
                  // Prevent input blur before click fires
                  e.preventDefault();
                }}
              >
                <div className="medimap-option-content">
                  <div className="medimap-option-main">
                    {isTypo ? (
                      <span className="medimap-typo-label">
                        Did you mean:{' '}
                        <strong>{item.matchedText ?? item.canonicalService.name}</strong>
                      </span>
                    ) : (
                      <span className="medimap-service-name">{item.canonicalService.name}</span>
                    )}

                    <span className="medimap-category-tag">{item.category}</span>
                  </div>

                  <div className="medimap-option-meta">
                    {isTypo ? (
                      <span className="medimap-badge medimap-badge-typo">Typo correction</span>
                    ) : item.matchedAlias &&
                      item.matchedAlias.toLowerCase() !==
                        item.canonicalService.name.toLowerCase() ? (
                      <span className="medimap-badge medimap-badge-alias">
                        <span className="medimap-lang-tag">
                          {item.matchedLanguage?.toUpperCase() ?? 'ALIAS'}
                        </span>
                        {item.matchedAlias}
                      </span>
                    ) : null}
                  </div>
                </div>

                <span className="medimap-option-arrow" aria-hidden="true">
                  →
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
