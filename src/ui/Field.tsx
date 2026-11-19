import {
  cloneElement,
  isValidElement,
  useId,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';

export interface FieldRenderProps {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-required'?: boolean;
}

export interface FieldProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  id?: string;
  label: string;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  control?: ReactNode;
  children?: ReactNode | ((props: FieldRenderProps) => ReactNode);
}

export const fieldControlStyles =
  'min-h-touch w-full rounded-sm border border-border-strong bg-surface px-2.5 text-base text-ink placeholder:text-muted focus-visible:outline-focus aria-[invalid=true]:border-error';

export function Field({
  id,
  label,
  hint,
  error,
  required = false,
  control,
  children,
  className = '',
  ...props
}: FieldProps) {
  const generatedId = useId().replace(/:/g, '');
  const fieldId = id ?? `field-${generatedId}`;

  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  const renderProps: FieldRenderProps = {
    id: fieldId,
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : undefined,
    'aria-required': required || undefined,
  };

  const target = children ?? control;

  let renderedControl: ReactNode = null;
  if (typeof target === 'function') {
    renderedControl = (target as (props: FieldRenderProps) => ReactNode)(renderProps);
  } else if (isValidElement(target)) {
    const existingElement = target as ReactElement<Record<string, unknown>>;
    renderedControl = cloneElement(existingElement, {
      id: existingElement.props.id ?? fieldId,
      'aria-describedby':
        [existingElement.props['aria-describedby'], describedBy].filter(Boolean).join(' ') ||
        undefined,
      'aria-invalid': existingElement.props['aria-invalid'] ?? (error ? 'true' : undefined),
      'aria-required': existingElement.props['aria-required'] ?? (required ? 'true' : undefined),
    });
  } else {
    renderedControl = target;
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className}`.trim()} {...props}>
      <label
        htmlFor={fieldId}
        className="flex items-center gap-1 text-small font-semibold text-ink"
      >
        {label}
        {required && (
          <span className="text-error" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {renderedControl}
      {hint && (
        <p id={hintId} className="text-small text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-small font-medium text-error">
          {error}
        </p>
      )}
    </div>
  );
}
