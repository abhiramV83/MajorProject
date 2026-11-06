import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, User, Scale, Activity } from 'lucide-react';
import { participantsAPI } from '../services/api';
import { MOCK_PARTICIPANTS } from '../services/mockData';
import toast from 'react-hot-toast';

export default function ParticipantFormPage() {
  const { participantId } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(participantId);

  const isDemo = typeof window !== 'undefined' && (new URLSearchParams(window.location.search).get('demo_auth') === 'judge' || !localStorage.getItem('access_token'));
  const fallbackParticipant = isEdit ? (MOCK_PARTICIPANTS.find((x) => String(x.id) === String(participantId)) || MOCK_PARTICIPANTS[0]) : null;

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(() => {
    if (isEdit && fallbackParticipant) {
      return {
        ...fallbackParticipant,
        percent_days_employed:
          fallbackParticipant.percent_days_employed != null
            ? Math.round(
                fallbackParticipant.percent_days_employed <= 1
                  ? fallbackParticipant.percent_days_employed * 100
                  : fallbackParticipant.percent_days_employed
              )
            : 60,
      };
    }
    return {
      first_name: '',
      last_name: '',
      age: 28,
      gender: 'Male',
      race: 'White',
      ethnicity: 'Non-Hispanic',
      marital_status: 'Single',
      employment_status: 'Employed (Part-Time)',
      monthly_income: 1500,
      education_level: 'High School / GED',
      num_dependents: 0,
      housing_status: 'Independent Rental',
      child_support: false,
      prior_arrests: 2,
      prior_felonies: 0,
      age_first_arrest: 21,
      arrest_frequency: 0.35,
      primary_substance: 'Opioids / Heroin',
      substance_use_frequency: 'Daily (Past)',
      trauma_score: 2.5,
      ace_score: 3,
      // Dynamic monitoring
      program_attendances: 12,
      program_unexcused_absences: 0,
      percent_days_employed: 60,
      drug_tests_positive_count: 0,
      program_status: 'Active',
    };
  });

  useEffect(() => {
    if (isEdit) {
      participantsAPI
        .get(participantId)
        .then((res) => {
          const d = res.data;
          setForm((prev) => ({
            ...prev,
            ...d,
            percent_days_employed:
              d.percent_days_employed != null
                ? Math.round(
                    d.percent_days_employed <= 1 ? d.percent_days_employed * 100 : d.percent_days_employed
                  )
                : 60,
          }));
        })
        .catch(() => {
          if (!isDemo) {
            toast.error('Unable to load participant details');
          }
        });
    }
  }, [isEdit, participantId, isDemo]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.first_name || !form.last_name) {
      return toast.error('Please enter first and last name');
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        age: Number(form.age),
        prior_arrests: Number(form.prior_arrests),
        prior_felonies: Number(form.prior_felonies),
        age_first_arrest: Number(form.age_first_arrest),
        monthly_income: Number(form.monthly_income),
        num_dependents: Number(form.num_dependents),
        trauma_score: Number(form.trauma_score),
        ace_score: Number(form.ace_score),
        program_attendances: Number(form.program_attendances),
        program_unexcused_absences: Number(form.program_unexcused_absences),
        percent_days_employed: Number(form.percent_days_employed) / 100.0,
        drug_tests_positive_count: Number(form.drug_tests_positive_count),
      };

      if (isEdit) {
        await participantsAPI.update(participantId, payload);
        toast.success('Participant updated successfully');
        navigate(`/participants/${participantId}`);
      } else {
        const res = await participantsAPI.create(payload);
        toast.success(`Participant created with ID: ${res.data.participant_id}`);
        navigate(`/participants/${res.data.id}`);
      }
    } catch {
      toast.error('Could not save participant record');
    } finally {
      setLoading(false);
    }
  };

  const selectOptionClass = "bg-bg-base dark:bg-bg-surface text-text-primary";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="min-h-[44px] text-xs text-text-muted hover:text-text-primary transition-colors inline-flex gap-2 items-center font-bold cursor-pointer"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <span className="text-xs text-accent-text font-mono font-bold">
          {isEdit ? `Editing Record #${participantId}` : 'New Intake Registration'}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="glass-card border border-border-ui/40 dark:border-border-ui/40 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight font-display">
            {isEdit ? 'Update Participant Record' : 'Register New Intake Participant'}
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Capture static pre-supervision features (criminal history, demographics, trauma) and ongoing supervision metrics.
          </p>
        </div>

        {/* Section 1: Demographics */}
        <div className="pt-5 border-t border-border-ui/30 dark:border-border-ui/40">
          <h2 className="text-xs font-bold uppercase tracking-wider text-accent-text flex items-center gap-2 mb-4 font-mono">
            <User size={15} /> 1. Identity & Demographics
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1.5">First Name *</label>
              <input
                type="text"
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-bg-base/80 dark:bg-bg-raised/50 border border-border-ui/40 dark:border-border-ui/40 text-base text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-accent-raw focus:border-accent-raw outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1.5">Last Name *</label>
              <input
                type="text"
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-bg-base/80 dark:bg-bg-raised/50 border border-border-ui/40 dark:border-border-ui/40 text-base text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-accent-raw focus:border-accent-raw outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1.5">Age</label>
              <input
                type="number"
                name="age"
                value={form.age}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-bg-base/80 dark:bg-bg-raised/50 border border-border-ui/40 dark:border-border-ui/40 text-base text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-accent-raw focus:border-accent-raw outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1.5">Gender</label>
              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-bg-base/80 dark:bg-bg-raised/50 border border-border-ui/40 dark:border-border-ui/40 text-base text-text-primary focus:ring-2 focus:ring-accent-raw focus:border-accent-raw outline-none transition-all cursor-pointer"
              >
                <option value="Male" className={selectOptionClass}>Male</option>
                <option value="Female" className={selectOptionClass}>Female</option>
                <option value="Non-Binary" className={selectOptionClass}>Non-Binary</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1.5">Race</label>
              <select
                name="race"
                value={form.race}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-bg-base/80 dark:bg-bg-raised/50 border border-border-ui/40 dark:border-border-ui/40 text-base text-text-primary focus:ring-2 focus:ring-accent-raw focus:border-accent-raw outline-none transition-all cursor-pointer"
              >
                <option value="White" className={selectOptionClass}>White</option>
                <option value="Black" className={selectOptionClass}>Black</option>
                <option value="Hispanic" className={selectOptionClass}>Hispanic</option>
                <option value="Asian" className={selectOptionClass}>Asian</option>
                <option value="Other" className={selectOptionClass}>Other / Multiracial</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1.5">Education Level</label>
              <select
                name="education_level"
                value={form.education_level}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-bg-base/80 dark:bg-bg-raised/50 border border-border-ui/40 dark:border-border-ui/40 text-base text-text-primary focus:ring-2 focus:ring-accent-raw focus:border-accent-raw outline-none transition-all cursor-pointer"
              >
                <option value="Some High School" className={selectOptionClass}>Some High School</option>
                <option value="High School / GED" className={selectOptionClass}>High School / GED</option>
                <option value="Some College / Vocational" className={selectOptionClass}>Some College / Vocational</option>
                <option value="Associate Degree" className={selectOptionClass}>Associate Degree</option>
                <option value="Bachelor Degree or Higher" className={selectOptionClass}>Bachelor Degree or Higher</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Criminal History & Clinical Scores */}
        <div className="pt-5 border-t border-border-ui/30 dark:border-border-ui/40">
          <h2 className="text-xs font-bold uppercase tracking-wider text-accent-text flex items-center gap-2 mb-4 font-mono">
            <Scale size={15} /> 2. Prior Record & Clinical Baseline (Static Intake Features)
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1.5">Prior Arrests</label>
              <input
                type="number"
                name="prior_arrests"
                value={form.prior_arrests}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-bg-base/80 dark:bg-bg-raised/50 border border-border-ui/40 dark:border-border-ui/40 text-base text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-accent-raw focus:border-accent-raw outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1.5">Prior Felonies</label>
              <input
                type="number"
                name="prior_felonies"
                value={form.prior_felonies}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-bg-base/80 dark:bg-bg-raised/50 border border-border-ui/40 dark:border-border-ui/40 text-base text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-accent-raw focus:border-accent-raw outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1.5">Age at 1st Arrest</label>
              <input
                type="number"
                name="age_first_arrest"
                value={form.age_first_arrest}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-bg-base/80 dark:bg-bg-raised/50 border border-border-ui/40 dark:border-border-ui/40 text-base text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-accent-raw focus:border-accent-raw outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1.5">Primary Substance</label>
              <input
                type="text"
                name="primary_substance"
                value={form.primary_substance}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-bg-base/80 dark:bg-bg-raised/50 border border-border-ui/40 dark:border-border-ui/40 text-base text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-accent-raw focus:border-accent-raw outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1.5">Trauma Score (0-5)</label>
              <input
                type="number"
                step="0.1"
                name="trauma_score"
                value={form.trauma_score}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-bg-base/80 dark:bg-bg-raised/50 border border-border-ui/40 dark:border-border-ui/40 text-base text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-accent-raw focus:border-accent-raw outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1.5">ACE Score (0-10)</label>
              <input
                type="number"
                name="ace_score"
                value={form.ace_score}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-bg-base/80 dark:bg-bg-raised/50 border border-border-ui/40 dark:border-border-ui/40 text-base text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-accent-raw focus:border-accent-raw outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1.5">Housing Status</label>
              <input
                type="text"
                name="housing_status"
                value={form.housing_status}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-bg-base/80 dark:bg-bg-raised/50 border border-border-ui/40 dark:border-border-ui/40 text-base text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-accent-raw focus:border-accent-raw outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1.5">Monthly Income ($)</label>
              <input
                type="number"
                name="monthly_income"
                value={form.monthly_income}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-bg-base/80 dark:bg-bg-raised/50 border border-border-ui/40 dark:border-border-ui/40 text-base text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-accent-raw focus:border-accent-raw outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Dynamic Supervision Tracking */}
        <div className="pt-5 border-t border-border-ui/30 dark:border-border-ui/40">
          <h2 className="text-xs font-bold uppercase tracking-wider text-accent-text flex items-center gap-2 mb-4 font-mono">
            <Activity size={15} /> 3. Ongoing Supervision Monitoring (Dynamic Model Features)
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1.5">Program Attendances</label>
              <input
                type="number"
                name="program_attendances"
                value={form.program_attendances}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-bg-base/80 dark:bg-bg-raised/50 border border-border-ui/40 dark:border-border-ui/40 text-base text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-accent-raw focus:border-accent-raw outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1.5">Unexcused Absences</label>
              <input
                type="number"
                name="program_unexcused_absences"
                value={form.program_unexcused_absences}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-bg-base/80 dark:bg-bg-raised/50 border border-border-ui/40 dark:border-border-ui/40 text-base text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-accent-raw focus:border-accent-raw outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1.5">Days Employed (%)</label>
              <input
                type="number"
                name="percent_days_employed"
                value={form.percent_days_employed}
                onChange={handleChange}
                min="0"
                max="100"
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-bg-base/80 dark:bg-bg-raised/50 border border-border-ui/40 dark:border-border-ui/40 text-base text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-accent-raw focus:border-accent-raw outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1.5">Positive Drug Screens</label>
              <input
                type="number"
                name="drug_tests_positive_count"
                value={form.drug_tests_positive_count}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-bg-base/80 dark:bg-bg-raised/50 border border-border-ui/40 dark:border-border-ui/40 text-base text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-accent-raw focus:border-accent-raw outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-5 border-t border-border-ui/30 dark:border-border-ui/40 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="min-h-[44px] px-6 py-2.5 rounded-full border border-border-ui/40 dark:border-border-ui/40 glass-pill hover:bg-bg-raised text-xs font-bold text-text-primary transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="min-h-[44px] px-6 py-2.5 rounded-full bg-accent-primary hover:bg-accent-hover text-accent-primary-text text-xs font-bold inline-flex items-center gap-2 transition-all shadow-xs hover:scale-[1.01] cursor-pointer disabled:opacity-50"
          >
            <Save size={16} /> {loading ? 'Saving...' : isEdit ? 'Update Participant Record' : 'Save Intake Registration'}
          </button>
        </div>
      </form>
    </div>
  );
}
