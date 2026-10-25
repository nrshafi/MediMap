import type { AmbiguityPromptProps } from './types';
import type { QueryMatch } from '../types';

/**
 * Disambiguation prompt requiring explicit patient selection between clinically distinct tests.
 */
export function AmbiguityPrompt({
  query,
  matches,
  onSelect,
  onCancel,
  id = 'medimap-ambiguity-prompt',
}: AmbiguityPromptProps) {
  if (matches.length === 0) {
    return null;
  }

  return (
    <div
      id={id}
      className="medimap-ambiguity-panel"
      role="region"
      aria-label="Diagnostic test disambiguation"
    >
      <div className="medimap-ambiguity-header">
        <div className="medimap-ambiguity-icon-wrapper" aria-hidden="true">
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
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div className="medimap-ambiguity-titles">
          <h3 className="medimap-ambiguity-title">Specific test selection required</h3>
          <p className="medimap-ambiguity-description">
            Multiple diagnostic tests match &ldquo;{query}&rdquo;. Select the specific test to
            continue:
          </p>
        </div>
      </div>

      <div
        className="medimap-ambiguity-options"
        role="group"
        aria-label="Select one of the matching diagnostic tests"
      >
        {matches.map((match: QueryMatch) => {
          const service = match.canonicalService;
          return (
            <button
              key={service.id}
              type="button"
              className="medimap-ambiguity-card"
              onClick={() => onSelect(match)}
              aria-label={`Select ${service.name}, category ${service.category}`}
            >
              <div className="medimap-ambiguity-card-info">
                <div className="medimap-ambiguity-card-header">
                  <span className="medimap-ambiguity-service-name">{service.name}</span>
                  <span className="medimap-category-tag">{service.category}</span>
                </div>

                {service.description ? (
                  <p className="medimap-ambiguity-card-desc">{service.description}</p>
                ) : null}

                {match.matchedText &&
                match.matchedText.toLowerCase() !== service.name.toLowerCase() ? (
                  <span className="medimap-ambiguity-matched-alias">
                    Matched: &ldquo;{match.matchedText}&rdquo;
                  </span>
                ) : null}
              </div>

              <span className="medimap-ambiguity-card-action" aria-hidden="true">
                Select →
              </span>
            </button>
          );
        })}
      </div>

      {onCancel ? (
        <div className="medimap-ambiguity-footer">
          <button type="button" className="medimap-ambiguity-cancel-btn" onClick={onCancel}>
            Cancel and edit query
          </button>
        </div>
      ) : null}
    </div>
  );
}
