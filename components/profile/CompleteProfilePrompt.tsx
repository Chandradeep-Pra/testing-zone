"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Sparkles, UserRoundCheck, X } from "lucide-react";
import toast from "react-hot-toast";

import { useAuth } from "@/components/auth/AuthProvider";
import { appPath } from "@/lib/app-path";
import { updateAccountPassword } from "@/lib/urologics-auth";

const DEFAULT_COUNTRY = "United Kingdom";
const DEFAULT_DIAL_CODE = "+44";
const DEFAULT_COUNTRY_VALUE = `${DEFAULT_COUNTRY}-${DEFAULT_DIAL_CODE}`;

type CountryOption = {
  label: string;
  value: string;
};

type RestCountry = {
  name?: {
    common?: string;
  };
  idd?: {
    root?: string;
    suffixes?: string[];
  };
};

const fallbackCountries: CountryOption[] = [
  { label: "India (+91)", value: "India-+91" },
  { label: "United Kingdom (+44)", value: DEFAULT_COUNTRY_VALUE },
  { label: "United States (+1)", value: "United States-+1" },
  { label: "United Arab Emirates (+971)", value: "United Arab Emirates-+971" },
  { label: "Singapore (+65)", value: "Singapore-+65" },
];

function getInitialName(name?: string | null, email?: string | null) {
  const cleanName = String(name || "").trim();

  if (cleanName && cleanName.toLowerCase() !== "guest user") {
    return cleanName;
  }

  return email?.split("@")[0]?.replace(/[._-]+/g, " ").trim() || "";
}

export default function CompleteProfilePrompt() {
  const { user, refreshUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [countries, setCountries] = useState<CountryOption[]>(fallbackCountries);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [name, setName] = useState(() => getInitialName(user?.name, user?.email));
  const [countryValue, setCountryValue] = useState(
    user?.country ? `${user.country}-${DEFAULT_DIAL_CODE}` : DEFAULT_COUNTRY_VALUE
  );
  const [medicalInstitution, setMedicalInstitution] = useState(user?.medicalInstitution || "");
  const [phone, setPhone] = useState(() => {
    const currentPhone = String(user?.phone || "").trim();
    return currentPhone.startsWith(DEFAULT_DIAL_CODE)
      ? currentPhone.slice(DEFAULT_DIAL_CODE.length).trim()
      : currentPhone;
  });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function loadCountries() {
      try {
        setCountriesLoading(true);
        const response = await fetch("https://restcountries.com/v3.1/all?fields=name,idd");
        const data = await response.json();

        if (!Array.isArray(data)) return;

        const nextCountries = (data as RestCountry[])
          .map((country) => {
            const root = country?.idd?.root;
            const suffix = country?.idd?.suffixes?.[0] ?? "";
            const name = country?.name?.common;

            if (!root || !name) return null;

            const dialCode = `${root}${suffix}`;
            return {
              label: `${name} (${dialCode})`,
              value: `${name}-${dialCode}`,
            };
          })
          .filter((country): country is CountryOption => Boolean(country))
          .sort((left, right) => left.label.localeCompare(right.label)) as CountryOption[];

        if (!cancelled && nextCountries.length > 0) {
          setCountries(nextCountries);
        }
      } catch {
        if (!cancelled) {
          setCountries(fallbackCountries);
        }
      } finally {
        if (!cancelled) {
          setCountriesLoading(false);
        }
      }
    }

    void loadCountries();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const selectedCountry = useMemo(() => {
    const [selectedName, selectedDialCode] = countryValue.split(/-(?=\+)/);

    return {
      name: selectedName || DEFAULT_COUNTRY,
      dialCode: selectedDialCode || DEFAULT_DIAL_CODE,
    };
  }, [countryValue]);

  const fullPhone = useMemo(() => {
    const cleanDialCode = selectedCountry.dialCode.trim() || DEFAULT_DIAL_CODE;
    const cleanPhone = phone.trim();

    return cleanPhone ? `${cleanDialCode} ${cleanPhone}`.trim() : "";
  }, [phone, selectedCountry.dialCode]);

  if (!user || user.tier !== "guest") {
    return null;
  }

  async function completeProfile() {
    if (!user?.idToken) {
      toast.error("Please login again to complete your profile.");
      return;
    }

    if (!name.trim()) {
      toast.error("Please enter your full name.");
      return;
    }

    if (!selectedCountry.name.trim()) {
      toast.error("Please enter your country.");
      return;
    }

    if (!password) {
      toast.error("Please create a password.");
      return;
    }

    if (password.length < 6) {
      toast.error("Password should be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);
      const accountUser = await updateAccountPassword(user, password);
      const response = await fetch(appPath("/api/urologics/upgrade-user"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accountUser.idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          country: selectedCountry.name.trim(),
          medicalInstitution: medicalInstitution.trim(),
          phone: fullPhone,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to complete profile.");
      }

      await refreshUser();
      toast.success("Profile completed. Free starter access is ready.");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to complete profile.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mb-6 overflow-hidden rounded-[30px] border border-[var(--accent)]/30 bg-[linear-gradient(135deg,var(--accent-soft),var(--surface))] p-4 shadow-[var(--shadow-soft)] sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--accent)] text-[var(--accent-text)]">
            <UserRoundCheck size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
              Complete profile
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
              Unlock your free starter access
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              Add your basic details to move from guest access to free access.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--accent-text)] transition hover:-translate-y-0.5"
        >
          <Sparkles size={16} />
          Complete now
        </button>
      </div>

      {open ? (
        <div className="mt-5 rounded-[26px] border border-[var(--border)] bg-[var(--surface-raised)] p-4 sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Your details</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                We will keep your email from the current login and update the rest.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-9 w-9 place-items-center rounded-full border border-[var(--border)] text-[var(--text-secondary)]"
              aria-label="Close complete profile form"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                Email
              </span>
              <input
                value={user.email}
                readOnly
                className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-secondary)] outline-none"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                Full name
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your full name"
                className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                Country
              </span>
              <select
                value={countryValue}
                onChange={(event) => setCountryValue(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
              >
                {countries.map((country) => (
                  <option key={`${country.label}-${country.value}`} value={country.value}>
                    {country.label}
                  </option>
                ))}
              </select>
              {countriesLoading ? (
                <span className="mt-1 block text-xs text-[var(--text-tertiary)]">
                  Loading country codes...
                </span>
              ) : null}
            </label>

            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                Phone number
              </span>
              <div className="mt-2 flex gap-2">
                <div className="w-24 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)]">
                  {selectedCountry.dialCode}
                </div>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Phone number"
                  className="min-w-0 flex-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                />
              </div>
            </div>

            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                Medical Institution
              </span>
              <input
                value={medicalInstitution}
                onChange={(event) => setMedicalInstitution(event.target.value)}
                placeholder="NHS Trust, hospital, medical college..."
                className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Create password"
                className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                Confirm Password
              </span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm password"
                className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={completeProfile}
            disabled={submitting}
            className="urologics-button-primary mt-5 inline-flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            <CheckCircle2 size={17} />
            {submitting ? "Completing..." : "Complete profile"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
