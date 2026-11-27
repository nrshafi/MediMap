import { useEffect, useState, type FormEvent } from 'react';
import { Eye, EyeOff, KeyRound, LogIn, UserPlus } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Field, fieldControlStyles } from '../../ui/Field';
import { Notice } from '../../ui/Notice';
import {
  emailMaxLength,
  errorField,
  formError,
  parseEmail,
  passwordFormMessages,
  type PasswordFormField,
} from './passwordForm';
import { checkPassword, passwordRuleSummary, type PasswordStrength } from './passwordRules';

type Errors = Partial<Record<PasswordFormField, string>>;

// The error code in the URL comes from the server. Show it next to its field, or above the form if it has no field.
function serverErrors(code: unknown): {
  errors: Errors;
  notice?: string;
  focus?: PasswordFormField;
} {
  const error = formError(code);
  if (!error) return { errors: {} };
  const target = errorField(error);
  if (!target) return { errors: {}, notice: passwordFormMessages[error] };
  return { errors: { [target]: passwordFormMessages[error] }, focus: target };
}

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}

// Checks the password and its confirmation. The server runs the same checks and stays the authority.
function passwordErrors(
  form: FormData,
  names: { password: string; confirm: string },
  email: string,
  fields: { password: PasswordFormField; confirm: PasswordFormField },
): Errors {
  const errors: Errors = {};
  const password = text(form, names.password);
  const failure = checkPassword(password, email).failures[0];
  if (failure) errors[fields.password] = failure.message;
  else if (password.normalize('NFC') !== text(form, names.confirm).normalize('NFC'))
    errors[fields.confirm] = passwordFormMessages.mismatch;
  return errors;
}

const strengthLabels: Record<PasswordStrength, string> = {
  weak: 'Weak',
  fair: 'Fair',
  strong: 'Strong',
};

function useFocus() {
  const [target, setTarget] = useState<{ id: string } | null>(null);
  useEffect(() => {
    if (target) document.getElementById(target.id)?.focus();
  }, [target]);
  return (id: string) => setTarget({ id });
}

export function PasswordField({
  id,
  name,
  label,
  autoComplete,
  error,
  hint,
  extraDescribedBy,
  autoFocus,
  onValue,
}: {
  id: string;
  name: string;
  label: string;
  autoComplete: 'current-password' | 'new-password';
  error?: string;
  hint?: string;
  extraDescribedBy?: string;
  autoFocus?: boolean;
  onValue?: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  // The show and hide button needs JavaScript. It appears only after the page is interactive.
  const [interactive, setInteractive] = useState(false);
  useEffect(() => setInteractive(true), []);
  return (
    <Field id={id} label={label} hint={hint} error={error} required>
      {(field) => (
        <div className="relative">
          <input
            {...field}
            aria-describedby={
              [field['aria-describedby'], extraDescribedBy].filter(Boolean).join(' ') || undefined
            }
            className={`${fieldControlStyles} pr-12`}
            name={name}
            type={visible ? 'text' : 'password'}
            autoComplete={autoComplete}
            autoFocus={autoFocus}
            onInput={onValue ? (event) => onValue(event.currentTarget.value) : undefined}
          />
          {interactive && (
            <button
              type="button"
              aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
              onClick={() => setVisible(!visible)}
              className="absolute inset-y-0 right-0 inline-flex min-h-touch w-11 items-center justify-center rounded-sm text-muted hover:text-ink focus-visible:outline-focus"
            >
              {visible ? <EyeOff aria-hidden size={18} /> : <Eye aria-hidden size={18} />}
            </button>
          )}
        </div>
      )}
    </Field>
  );
}

function EmailField({
  id,
  error,
  autoFocus,
  onValue,
}: {
  id: string;
  error?: string;
  autoFocus?: boolean;
  onValue?: (value: string) => void;
}) {
  return (
    <Field id={id} label="Email" error={error} required>
      {(field) => (
        <input
          {...field}
          className={fieldControlStyles}
          name="email"
          type="email"
          autoComplete="email"
          maxLength={emailMaxLength}
          autoFocus={autoFocus}
          onInput={onValue ? (event) => onValue(event.currentTarget.value) : undefined}
        />
      )}
    </Field>
  );
}

export function PasswordSignInForm({ returnTo, error }: { returnTo: string; error?: string }) {
  const { errors, notice, focus } = serverErrors(error);
  return (
    <form method="post" action="/auth/password/sign-in" className="grid gap-4">
      <input type="hidden" name="returnTo" value={returnTo} />
      {notice && <Notice kind="error">{notice}</Notice>}
      <EmailField id="sign-in-email" />
      <PasswordField
        id="sign-in-password"
        name="password"
        label="Password"
        autoComplete="current-password"
        error={errors.password}
        autoFocus={focus === 'password'}
      />
      <Button type="submit" variant="secondary" icon={<LogIn aria-hidden size={18} />}>
        Sign in with email
      </Button>
    </form>
  );
}

export function SignUpForm({ returnTo, error }: { returnTo: string; error?: string }) {
  const initial = serverErrors(error);
  const [errors, setErrors] = useState<Errors>(initial.errors);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const focusField = useFocus();
  const strength = password ? checkPassword(password, email) : null;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const form = new FormData(event.currentTarget);
    const next: Errors = {};
    if (!parseEmail(text(form, 'email'))) next.email = passwordFormMessages.invalid_email;
    Object.assign(
      next,
      passwordErrors(
        form,
        { password: 'password', confirm: 'confirmPassword' },
        text(form, 'email'),
        {
          password: 'password',
          confirm: 'confirm',
        },
      ),
    );
    setErrors(next);
    const first = (['email', 'password', 'confirm'] as const).find((name) => next[name]);
    if (first) {
      event.preventDefault();
      focusField(`sign-up-${first}`);
    }
  }

  return (
    <form
      method="post"
      action="/auth/password/sign-up"
      noValidate
      onSubmit={onSubmit}
      className="grid gap-4"
    >
      <input type="hidden" name="returnTo" value={returnTo} />
      {initial.notice && <Notice kind="error">{initial.notice}</Notice>}
      <EmailField
        id="sign-up-email"
        error={errors.email}
        autoFocus={initial.focus === 'email'}
        onValue={setEmail}
      />
      <PasswordField
        id="sign-up-password"
        name="password"
        label="Password"
        autoComplete="new-password"
        hint={passwordRuleSummary.join(' ')}
        extraDescribedBy="sign-up-strength"
        error={errors.password}
        autoFocus={initial.focus === 'password'}
        onValue={setPassword}
      />
      <p id="sign-up-strength" aria-live="polite" className="-mt-2 text-small text-muted">
        {strength ? `Password strength: ${strengthLabels[strength.strength]}.` : ''}
      </p>
      <PasswordField
        id="sign-up-confirm"
        name="confirmPassword"
        label="Confirm password"
        autoComplete="new-password"
        error={errors.confirm}
        autoFocus={initial.focus === 'confirm'}
      />
      <Button type="submit" variant="primary" icon={<UserPlus aria-hidden size={18} />}>
        Create account
      </Button>
    </form>
  );
}

export function ChangePasswordForm({ email, error }: { email: string; error?: string }) {
  const initial = serverErrors(error);
  const [errors, setErrors] = useState<Errors>(initial.errors);
  const [password, setPassword] = useState('');
  const focusField = useFocus();
  const strength = password ? checkPassword(password, email) : null;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const form = new FormData(event.currentTarget);
    const next: Errors = {};
    if (!text(form, 'currentPassword')) next.current = passwordFormMessages.current_incorrect;
    Object.assign(
      next,
      passwordErrors(form, { password: 'newPassword', confirm: 'confirmNewPassword' }, email, {
        password: 'password',
        confirm: 'confirm',
      }),
    );
    setErrors(next);
    const first = (['current', 'password', 'confirm'] as const).find((name) => next[name]);
    if (first) {
      event.preventDefault();
      focusField(`change-${first}`);
    }
  }

  return (
    <form
      method="post"
      action="/auth/password/change"
      noValidate
      onSubmit={onSubmit}
      className="grid gap-4"
    >
      {initial.notice && <Notice kind="error">{initial.notice}</Notice>}
      <PasswordField
        id="change-current"
        name="currentPassword"
        label="Current password"
        autoComplete="current-password"
        error={errors.current}
        autoFocus={initial.focus === 'current'}
      />
      <PasswordField
        id="change-password"
        name="newPassword"
        label="New password"
        autoComplete="new-password"
        hint={passwordRuleSummary.join(' ')}
        extraDescribedBy="change-strength"
        error={errors.password}
        autoFocus={initial.focus === 'password'}
        onValue={setPassword}
      />
      <p id="change-strength" aria-live="polite" className="-mt-2 text-small text-muted">
        {strength ? `Password strength: ${strengthLabels[strength.strength]}.` : ''}
      </p>
      <PasswordField
        id="change-confirm"
        name="confirmNewPassword"
        label="Confirm new password"
        autoComplete="new-password"
        error={errors.confirm}
        autoFocus={initial.focus === 'confirm'}
      />
      <Button type="submit" variant="secondary" icon={<KeyRound aria-hidden size={18} />}>
        Change password
      </Button>
    </form>
  );
}
