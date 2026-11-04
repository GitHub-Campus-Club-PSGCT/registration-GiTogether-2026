import { useRef, useState } from 'react';
import { ArrowRight, Flag, Hash, Phone, Plus, Trash2, User } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import AuthCard from '@/components/auth/AuthCard';
import AuthHeading from '@/components/auth/AuthHeading';
import AuthSuccess from '@/components/auth/AuthSuccess';
import FormBanner from '@/components/ui/FormBanner';
import SubmitButton from '@/components/ui/SubmitButton';
import TextField from '@/components/ui/TextField';
import { registerTeam } from '@/lib/authService';
import { collapseProps, instantMemberVariants, memberCardVariants, memberFieldVariants, memberStreakVariants, memberVariants, riseVariants, scrollPageToElement, scrollPageToTop } from '@/lib/motion';
import {
  MAX_MEMBER_NAME_LENGTH,
  MAX_TEAM_MEMBERS,
  MAX_TEAM_NAME_LENGTH,
  MIN_TEAM_MEMBERS,
  ROLL_NUMBER_LENGTH,
  emailFromRollNumber,
  hasTeamErrors,
  normalizePhone,
  normalizeRollNumber,
  validateTeamRegistration,
} from '@/lib/validation';

const createEmptyMember = () => ({ fullName: '', phone: '', rollNumber: '' });

const createEmptyTeam = () => ({
  teamName: '',
  members: Array.from({ length: MIN_TEAM_MEMBERS }, createEmptyMember),
});

const buildTeamPayload = (values) => ({
  teamName: values.teamName.trim(),
  members: values.members.map((member) => ({
    name: member.fullName.trim(),
    phone: normalizePhone(member.phone),
    rollNumber: normalizeRollNumber(member.rollNumber),
  })),
});

const buildSuccessMessage = ({ teamName, members, emailQueued }) =>
  `${teamName} is registered with ${members.length} members.${
    emailQueued ? ` We're emailing your pass to ${emailFromRollNumber(members[0].rollNumber)}.` : ''
  } See you on the grid!`;

// Keeps a growing card on screen by scrolling with it, frame by frame.
const followGrowingCard = (card) => {
  if (!card) return;
  const { top, bottom } = card.getBoundingClientRect();
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const overflow = Math.min(bottom - viewportHeight + 24, top - 16);
  if (overflow > 0) window.scrollBy(0, overflow);
};

export default function RegisterForm() {
  const [values, setValues] = useState(createEmptyTeam);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const followedMember = useRef(null);
  const returnFocusToAdd = useRef(false);
  const reduceMotion = useReducedMotion();

  const canAddMember = values.members.length < MAX_TEAM_MEMBERS;

  const resetForm = () => {
    setValues(createEmptyTeam());
    setErrors({});
    setFormError(null);
    setSubmitted(null);
    scrollPageToTop(reduceMotion);
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
    const newMemberIndex = values.members.length;
    setValues((current) => ({ ...current, members: [...current.members, createEmptyMember()] }));
    setErrors({});
    followedMember.current = newMemberIndex;
    requestAnimationFrame(() => {
      // If they've already moved to another field, don't pull the cursor away from it.
      if (document.activeElement?.tagName === 'INPUT') return;
      document.querySelector(`[name="member${newMemberIndex}FullName"]`)?.focus({ preventScroll: true });
    });
  };

  const removeMember = (index) => {
    setValues((current) => ({ ...current, members: current.members.filter((_, i) => i !== index) }));
    setErrors({});
    followedMember.current = null;
    returnFocusToAdd.current = true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    const nextErrors = validateTeamRegistration(values);
    setErrors(nextErrors);
    if (hasTeamErrors(nextErrors)) {
      // The form is long, so bring the first problem into view.
      requestAnimationFrame(() => {
        const firstProblem = document.querySelector('[aria-invalid="true"]');
        if (!firstProblem) return;
        firstProblem.focus({ preventScroll: true });
        scrollPageToElement(firstProblem, reduceMotion);
      });
      return;
    }

    setSubmitting(true);
    const payload = buildTeamPayload(values);
    try {
      const result = await registerTeam(payload);
      setSubmitted({ ...payload, ...result });
      scrollPageToTop(reduceMotion);
    } catch (error) {
      setFormError(error.message);
      scrollPageToTop(reduceMotion);
    } finally {
      setSubmitting(false);
    }
  };

  const handleActionSwapped = () => {
    if (!returnFocusToAdd.current) return;
    returnFocusToAdd.current = false;
    requestAnimationFrame(() => document.querySelector('[data-add-member]')?.focus());
  };

  return (
    <AnimatePresence mode="wait">
      {submitted ? (
        <AuthCard key="success">
          <AuthSuccess
            title="Team registered"
            message={buildSuccessMessage(submitted)}
            whatsappUrl={submitted.whatsappUrl}
            actionLabel="Register another team"
            onAction={resetForm}
          />
        </AuthCard>
      ) : (
        <AuthCard key="form" wide>
          <AuthHeading
            eyebrow="Online Team Registration"
            title="Register your team"
            description="Enter your team name and the details of every member."
          />

          <AnimatePresence initial={false}>
            {(formError || errors.form) && (
              <motion.div {...collapseProps} className="overflow-hidden">
                <FormBanner message={formError ?? errors.form} />
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} noValidate>
            <motion.div variants={riseVariants} className="mb-5">
              <TextField
                label="Team name"
                name="teamName"
                placeholder="Make it a good one ;)"
                maxLength={MAX_TEAM_NAME_LENGTH}
                value={values.teamName}
                onChange={updateTeamName}
                error={errors.teamName}
                icon={<Flag className="h-[18px] w-[18px]" />}
              />
            </motion.div>

            <motion.div variants={riseVariants}>
              <AnimatePresence initial={false}>
                {values.members.map((member, index) => {
                  const memberErrors = errors.members?.[index] ?? {};
                  return (
                    <motion.div
                      key={index}
                      variants={reduceMotion ? instantMemberVariants : memberVariants}
                      initial="closed"
                      animate="open"
                      exit="closed"
                      onUpdate={() => {
                        if (followedMember.current === index) followGrowingCard(document.getElementById(`member-${index}`));
                      }}
                      onAnimationComplete={(definition) => {
                        if (definition === 'open' && followedMember.current === index) followedMember.current = null;
                      }}
                      className="overflow-hidden"
                    >
                      <div className="pb-5">
                        <motion.section
                          id={`member-${index}`}
                          variants={memberCardVariants}
                          className="relative flex flex-col gap-5 overflow-hidden rounded-xl border border-graphite-700/60 bg-graphite-900/40 p-4 sm:p-5"
                        >
                          <motion.span
                            variants={memberStreakVariants}
                            className="pointer-events-none absolute inset-x-0 top-0 h-0.5 origin-left bg-gradient-to-r from-brand-700 via-brand-500 to-brand-300"
                            aria-hidden="true"
                          />
                          <motion.div variants={memberFieldVariants} className="flex items-center justify-between">
                            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-400">{index === 0 ? 'Team Leader' : `Member ${index + 1}`}</h2>
                            {index >= MIN_TEAM_MEMBERS && (
                              <button
                                type="button"
                                onClick={() => removeMember(index)}
                                className="inline-flex items-center gap-1.5 rounded text-xs font-medium uppercase tracking-[0.14em] text-graphite-300 transition duration-150 hover:text-error-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 active:scale-95"
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                Remove
                              </button>
                            )}
                          </motion.div>

                          <div className="grid gap-5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-[1.3fr_1fr_1fr]">
                            <motion.div variants={memberFieldVariants} className="min-w-0 sm:col-span-2 lg:col-span-1">
                              <TextField
                                label="Full name"
                                name={`member${index}FullName`}
                                autoComplete="off"
                                placeholder="First and last name"
                                maxLength={MAX_MEMBER_NAME_LENGTH}
                                value={member.fullName}
                                onChange={updateMember(index, 'fullName')}
                                error={memberErrors.fullName}
                                icon={<User className="h-[18px] w-[18px]" />}
                              />
                            </motion.div>

                            <motion.div variants={memberFieldVariants} className="min-w-0">
                              <TextField
                                label="Phone number"
                                name={`member${index}Phone`}
                                type="tel"
                                inputMode="tel"
                                autoComplete="off"
                                placeholder="10-digit mobile number"
                                value={member.phone}
                                onChange={updateMember(index, 'phone')}
                                error={memberErrors.phone}
                                icon={<Phone className="h-[18px] w-[18px]" />}
                              />
                            </motion.div>

                            <motion.div variants={memberFieldVariants} className="min-w-0">
                              <TextField
                                label="Roll number"
                                name={`member${index}RollNumber`}
                                autoComplete="off"
                                autoCapitalize="characters"
                                placeholder="As in your college email"
                                maxLength={ROLL_NUMBER_LENGTH}
                                value={member.rollNumber}
                                onChange={updateMember(index, 'rollNumber')}
                                error={memberErrors.rollNumber}
                                icon={<Hash className="h-[18px] w-[18px]" />}
                              />
                            </motion.div>
                          </div>
                        </motion.section>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>

            <motion.div variants={riseVariants} className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <AnimatePresence mode="wait" initial={false} onExitComplete={handleActionSwapped}>
                {canAddMember ? (
                  <motion.button
                    key="add"
                    type="button"
                    data-add-member
                    onClick={addMember}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-graphite-500 text-sm font-medium uppercase tracking-[0.14em] text-graphite-200 transition duration-150 hover:border-brand-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 active:scale-[0.98] lg:w-56"
                  >
                    <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" aria-hidden="true" />
                    Add Member
                  </motion.button>
                ) : (
                  <motion.p
                    key="limit"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex h-12 items-center justify-center text-xs text-graphite-300 lg:w-56 lg:justify-start"
                  >
                    A team can have up to {MAX_TEAM_MEMBERS} members.
                  </motion.p>
                )}
              </AnimatePresence>

              <SubmitButton loading={submitting} className="lg:w-72">
                <span className="inline-flex items-center gap-2">
                  Register team
                  {!submitting && <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />}
                </span>
              </SubmitButton>
            </motion.div>
          </form>
        </AuthCard>
      )}
    </AnimatePresence>
  );
}
