import { useEffect, useId, useState } from 'react';
import { MIN_CUSTOM_RADIUS_KM, MAX_CUSTOM_RADIUS_KM } from '../../map/radiusFilter';
import type { RadiusPreset, RadiusSelectorProps } from './types';

const PRESETS: readonly (1 | 3 | 5)[] = [1, 3, 5];
const MIN_RADIUS_KM = MIN_CUSTOM_RADIUS_KM;
const MAX_RADIUS_KM = MAX_CUSTOM_RADIUS_KM;

/**
 * Segmented straight-line radius selector with preset chips and custom range input.
 *
 * Architecture Invariant:
 * Explicitly labels radius filtering as straight-line distance. Road travel distance
 * is calculated separately and must never be conflated with straight-line search radius.
 */
export function RadiusSelector({
  value,
  onChange,
  disabled = false,
  id,
  className = '',
}: RadiusSelectorProps) {
  const generatedId = useId();
  const baseId = id ?? `medimap-radius-${generatedId}`;

  // Determine active preset
  const isPresetValue = (v: number): v is 1 | 3 | 5 => v === 1 || v === 3 || v === 5;

  const [activePreset, setActivePreset] = useState<RadiusPreset>(() =>
    isPresetValue(value) ? value : 'custom',
  );

  const [customInputValue, setCustomInputValue] = useState<string>(() =>
    isPresetValue(value) ? '10' : String(value),
  );

  const [validationError, setValidationError] = useState<string | null>(null);
  useEffect(() => {
    setActivePreset(isPresetValue(value) ? value : 'custom');
    if (!isPresetValue(value)) setCustomInputValue(String(value));
    setValidationError(null);
  }, [value]);

  const handlePresetSelect = (preset: RadiusPreset) => {
    if (disabled) {
      return;
    }
    setActivePreset(preset);
    setValidationError(null);

    if (preset === 'custom') {
      const parsed = parseFloat(customInputValue);
      if (!isNaN(parsed) && parsed >= MIN_RADIUS_KM && parsed <= MAX_RADIUS_KM) {
        onChange(parsed);
      } else {
        setValidationError(`Enter a distance between ${MIN_RADIUS_KM} km and ${MAX_RADIUS_KM} km.`);
      }
    } else {
      onChange(preset);
    }
  };

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setCustomInputValue(rawValue);

    if (rawValue.trim() === '') {
      setValidationError('Please enter a radius distance.');
      return;
    }

    const parsed = parseFloat(rawValue);
    if (isNaN(parsed) || parsed < MIN_RADIUS_KM || parsed > MAX_RADIUS_KM) {
      setValidationError(`Distance must be between ${MIN_RADIUS_KM} km and ${MAX_RADIUS_KM} km.`);
    } else {
      setValidationError(null);
      onChange(parsed);
    }
  };

  return (
    <fieldset
      id={baseId}
      className={`medimap-radius-fieldset ${className}`.trim()}
      disabled={disabled}
    >
      <div className="medimap-radius-header">
        <legend className="medimap-radius-legend">Straight-line radius</legend>
        <span className="medimap-radius-hint">Radial distance filter</span>
      </div>

      <div
        className="medimap-radius-segmented"
        role="radiogroup"
        aria-label="Straight-line search radius"
      >
        {PRESETS.map((preset) => {
          const isChecked = activePreset === preset && value === preset;
          return (
            <label
              key={preset}
              className={`medimap-radius-pill ${isChecked ? 'medimap-radius-pill-active' : ''}`}
            >
              <input
                type="radio"
                name={`${baseId}-preset`}
                value={preset}
                checked={isChecked}
                onChange={() => handlePresetSelect(preset)}
                disabled={disabled}
                className="medimap-sr-only"
              />
              <span>{preset} km</span>
            </label>
          );
        })}

        <label
          className={`medimap-radius-pill ${
            activePreset === 'custom' ? 'medimap-radius-pill-active' : ''
          }`}
        >
          <input
            type="radio"
            name={`${baseId}-preset`}
            value="custom"
            checked={activePreset === 'custom'}
            onChange={() => handlePresetSelect('custom')}
            disabled={disabled}
            className="medimap-sr-only"
          />
          <span>Custom</span>
        </label>
      </div>

      {activePreset === 'custom' ? (
        <div className="medimap-custom-radius-box">
          <label htmlFor={`${baseId}-custom-input`} className="medimap-custom-radius-label">
            Custom straight-line distance (km):
          </label>
          <div className="medimap-custom-radius-control">
            <input
              id={`${baseId}-custom-input`}
              type="number"
              min={MIN_RADIUS_KM}
              max={MAX_RADIUS_KM}
              step="any"
              value={customInputValue}
              onChange={handleCustomInputChange}
              disabled={disabled}
              className="medimap-custom-radius-input"
              aria-describedby={validationError ? `${baseId}-error` : undefined}
              aria-invalid={Boolean(validationError)}
            />
            <span className="medimap-custom-radius-unit">km</span>
          </div>

          {validationError ? (
            <p id={`${baseId}-error`} className="medimap-radius-error-message" role="alert">
              {validationError}
            </p>
          ) : (
            <p className="medimap-radius-range-hint">
              Accepts {MIN_RADIUS_KM} km to {MAX_RADIUS_KM} km.
            </p>
          )}
        </div>
      ) : null}
    </fieldset>
  );
}
