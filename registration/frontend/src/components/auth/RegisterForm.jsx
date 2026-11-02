import { useState } from 'react';
import { ArrowRight, Check, Flag, Mail, Plus, Trash2, User } from 'lucide-react';
import AuthHeading from '@/components/auth/AuthHeading';
import AuthSuccess from '@/components/auth/AuthSuccess';
import FormBanner from '@/components/ui/FormBanner';
import PasswordField from '@/components/ui/PasswordField';
import SubmitButton from '@/components/ui/SubmitButton';
import TextField from '@/components/ui/TextField';
import { registerTeam } from '@/lib/authService';
import {
  MAX_TEAM_MEMBERS,
  MIN_TEAM_MEMBERS,
  getPasswordChecks,
  hasTeamErrors,
  validateTeamRegistration,
} from '@/lib/validation';

const REGISTRATION_EYEBROWS = {
  online: 'Online Team Registration',
  onsite: 'On-Spot Team Registration',
};

const PASSWORD_RULES = [
  { key: 'length', label: 'At least 8 characters' },
  { key: 'letter', label: 'Contains a letter' },
  { key: 'number', label: 'Contains a number' },
];

const createEmptyMember = () => ({ fullName: '', email: '', password: '' });

const createEmptyTeam = () => ({
  teamName: '',
  members: Array.from({ length: MIN_TEAM_MEMBERS }, createEmptyMember),
});

const buildTeamPayload = (values, registrationType) => ({
  teamName: values.teamName.trim(),
  registrationType,
  members: values.members.map((member) => ({
    name: member.fullName.trim(),
    email: member.email.trim(),
    password: member.password,
  })),
});

export default function RegisterForm({ onSignIn, registrationType = 'online' }) {
  const [values, setValues] = useState(createEmptyTeam);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);

  const canAddMember = values.members.length < MAX_TEAM_MEMBERS;

  const resetForm = () => {
    setValues(createEmptyTeam());
    setErrors({});
    setFormError(null);
    setSubmitted(null);
  };

  const updateTeamName = (event) => {
    setValues((current) => ({ ...current, teamName: event.target.value }));
    if (errors.teamName) setErrors((current) => ({ ...current, teamName: undefined }));
  };

  const updateMember = (index, field) => (event) => {
    const { value } = event.target;
    setValues((current) => ({
      ...current,
      members: current.members.map((member, i) => (i === index ? { ...member, [field]: value } : member)),
    }));
    if (errors.members?.[index]?.[field]) {
      setErrors((current) => ({
        ...current,
        members: current.members.map((memberErrors, i) => (i === index ? { ...memberErrors, [field]: undefined } : memberErrors)),
      }));
    }
  };

  const addMember = () => {
    setValues((current) => ({ ...current, members: [...current.members, createEmptyMember()] }));
    setErrors({});
  };

  const removeMember = (index) => {
    setValues((current) => ({ ...current, members: current.members.filter((_, i) => i !== index) }));
    setErrors({});
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    const nextErrors = validateTeamRegistration(values);
    setErrors(nextErrors);
    if (hasTeamErrors(nextErrors)) return;

    setSubmitting(true);
    const payload = buildTeamPayload(values, registrationType);
    try {
      await registerTeam(payload);
      setSubmitted(payload);
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <AuthSuccess
        title="Team registered"
        message={`${submitted.teamName} is registered with ${submitted.members.length} members as an ${
          submitted.registrationType === 'onsite' ? 'on-spot' : 'online'
        } entry.`}
        actionLabel={onSignIn ? 'Back to sign in' : 'Register another team'}
        onAction={onSignIn ?? resetForm}
      />
    );
  }

  return (
    <>
      <AuthHeading
        eyebrow={REGISTRATION_EYEBROWS[registrationType]}
        title="Register your team"
        description="Enter your team details and a separate sign-in for every member."
      />

      {(formError || errors.form) && <FormBanner message={formError ?? errors.form} />}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <TextField
          label="Team name"
          name="teamName"
          placeholder="Team Alpha"
          value={values.teamName}
          onChange={updateTeamName}
          error={errors.teamName}
          icon={<Flag className="h-[18px] w-[18px]" />}
        />

        {values.members.map((member, index) => {
          const memberErrors = errors.members?.[index] ?? {};
          const passwordChecks = getPasswordChecks(member.password);
          return (
            <section key={index} className="space-y-5 rounded-xl border border-graphite-700/60 bg-graphite-900/40 p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-[11px] font-medium uppercase tracking-[0.35em] text-brand-500">Member {index + 1}</h2>
                {index >= MIN_TEAM_MEMBERS && (
                  <button
                    type="button"
                    onClick={() => removeMember(index)}
                    className="inline-flex items-center gap-1.5 rounded text-xs font-medium uppercase tracking-[0.18em] text-graphite-400 transition-colors hover:text-error-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Remove
                  </button>
                )}
              </div>

              <TextField
                label="Full name"
                name={`member${index}FullName`}
                autoComplete="off"
                placeholder="Alex Morgan"
                value={member.fullName}
                onChange={updateMember(index, 'fullName')}
                error={memberErrors.fullName}
                icon={<User className="h-[18px] w-[18px]" />}
              />

              <TextField
                label="Email"
                name={`member${index}Email`}
                type="email"
                autoComplete="off"
                placeholder="name@psgtech.ac.in"
                value={member.email}
                onChange={updateMember(index, 'email')}
                error={memberErrors.email}
                icon={<Mail className="h-[18px] w-[18px]" />}
              />

              <div>
                <PasswordField
                  label="Password"
                  name={`member${index}Password`}
                  autoComplete="new-password"
                  placeholder="Create a password"
                  value={member.password}
                  onChange={updateMember(index, 'password')}
                  error={memberErrors.password}
                />
                <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-3 sm:gap-3" aria-label="Password requirements">
                  {PASSWORD_RULES.map((rule) => {
                    const met = passwordChecks[rule.key];
                    return (
                      <li key={rule.key} className={`flex items-center gap-1.5 text-xs transition-colors duration-300 ${met ? 'text-success-400' : 'text-graphite-400'}`}>
                        <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border transition-colors duration-300 ${met ? 'border-success-500 bg-success-500/20' : 'border-graphite-600'}`}>
                          {met && <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />}
                        </span>
                        {rule.label}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          );
        })}

        {canAddMember ? (
          <button
            type="button"
            onClick={addMember}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-graphite-500 text-sm font-medium uppercase tracking-[0.18em] text-graphite-200 transition-colors duration-300 hover:border-brand-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Member
          </button>
        ) : (
          <p className="text-center text-xs text-graphite-400">A team can have up to {MAX_TEAM_MEMBERS} members.</p>
        )}

        <SubmitButton loading={submitting} className="mt-2">
          <span className="inline-flex items-center gap-2">
            Register team
            {!submitting && <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />}
          </span>
        </SubmitButton>
      </form>

      {onSignIn && (
        <p className="mt-8 text-center text-sm text-graphite-300">
          Already registered?{' '}
          <button
            type="button"
            onClick={onSignIn}
            className="rounded font-semibold text-white underline decoration-brand-600 decoration-2 underline-offset-4 transition-colors hover:text-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            Sign in
          </button>
        </p>
      )}
    </>
  );
}
