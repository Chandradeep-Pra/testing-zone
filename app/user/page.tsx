"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, BookOpenCheck, Camera, ChevronDown, Clock3, KeyRound, LogOut, Pencil } from "lucide-react";
import Link from "next/link";

import { useAuth } from "@/components/auth/AuthProvider";
import UrologicsHeader from "@/components/brand/UrologicsHeader";
import AccountSectionError from "@/components/profile/AccountSectionError";
import PurchaseHistory, { type Purchase } from "@/components/profile/PurchaseHistory";
import GlobalLoading from "@/components/ui/GlobalLoading";
import RankAvatar from "@/components/ui/RankAvatar";
import { appPath } from "@/lib/app-path";
import { accountQueryKey, readUrologicsJson } from "@/lib/client/urologicsQuery";
import { getStoredAuth, refreshStoredAuth } from "@/lib/urologics-auth";
import "./account.css";

type AccessPayload = {
  tier?: string;
  profile?: {
    name?: string | null;
    email?: string | null;
    profileImageUrl?: string | null;
    phone?: string | null;
    medicalInstitution?: string | null;
    activeCourseIds?: string[];
    activeCourses?: { id: string; title: string }[];
    activePlanStatus?: string | null;
    planExpiresAt?: string | null;
  };
  plan?: { title?: string; name?: string; categoryName?: string } | null;
  entitlements?: { courseIds?: string[]; videoIds?: string[]; mockIds?: string[]; vivaCaseIds?: string[] } | null;
  vivaCredit?: { totalMinutes: number; usedMinutes: number; remainingMinutes: number; percentRemaining: number } | null;
};

const ACCESS_PATH = "/api/urologics/access";
const PURCHASES_PATH = "/api/urologics/purchases";
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function formatDate(value?: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return "Not provided";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export default function UserPage() {
  const { user, loading } = useAuth();
  return (
    <main className="urologics-shell account-page">
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-6 sm:py-4">
        <UrologicsHeader current="Profile" product="Account" tag="Your profile and access" />
        <div className="account-content">
          {loading ? <div className="account-panel"><GlobalLoading label="Loading your account" /></div> : !user ? (
            <section className="account-panel account-login">
              <h1>Your account</h1>
              <p>Sign in to manage your profile and access.</p>
              <a href="https://urologics.co.uk/login?mode=login" className="account-button account-button-primary">Sign in</a>
            </section>
          ) : <AccountContent key={user.uid} />}
        </div>
      </div>
    </main>
  );
}

function AccountContent() {
  const { user, refreshUser, signOut } = useAuth();
  const queryClient = useQueryClient();
  const accessQuery = useQuery({
    queryKey: accountQueryKey(user?.uid, ACCESS_PATH),
    queryFn: ({ signal }) => readUrologicsJson<AccessPayload>(ACCESS_PATH, user, signal),
    enabled: Boolean(user),
  });
  const purchasesQuery = useQuery({
    queryKey: accountQueryKey(user?.uid, PURCHASES_PATH),
    queryFn: ({ signal }) => readUrologicsJson<{ purchases?: Purchase[] }>(PURCHASES_PATH, user, signal),
    enabled: Boolean(user),
  });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState("");
  const [institutionDraft, setInstitutionDraft] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [profileNotice, setProfileNotice] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetNotice, setResetNotice] = useState("");
  const [resetError, setResetError] = useState("");
  const editButton = useRef<HTMLButtonElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const institutionInput = useRef<HTMLInputElement>(null);
  const access = accessQuery.data;
  const phone = access?.profile?.phone !== undefined ? access.profile.phone || "" : user?.phone || "";
  const institution = access?.profile?.medicalInstitution !== undefined ? access.profile.medicalInstitution || "" : user?.medicalInstitution || "";
  const image = photoPreview || access?.profile?.profileImageUrl || user?.profileImageUrl || null;

  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview); }, [photoPreview]);
  useEffect(() => { if (editing) institutionInput.current?.focus(); }, [editing]);

  if (!user) return null;

  function beginEdit() {
    setPhoneDraft(phone);
    setInstitutionDraft(institution);
    setPhoto(null);
    setPhotoPreview("");
    setPhotoError("");
    setSaveError("");
    setProfileNotice("");
    setEditing(true);
  }

  function closeEdit() {
    setEditing(false);
    setPhoto(null);
    setPhotoPreview("");
    setPhotoError("");
    setSaveError("");
    requestAnimationFrame(() => editButton.current?.focus());
  }

  function changePhoto(file?: File) {
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) { setPhotoError("Choose a JPG, PNG, WebP or GIF image."); return; }
    if (file.size > 5 * 1024 * 1024) { setPhotoError("Choose an image smaller than 5 MB."); return; }
    setPhotoError("");
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || saving || photoError) return;
    setSaving(true);
    setSaveError("");
    const savedPhone = phoneDraft.trim();
    const savedInstitution = institutionDraft.trim();
    let profileImageUrl = access?.profile?.profileImageUrl || user.profileImageUrl || null;
    try {
      const stored = getStoredAuth();
      let currentUser = stored?.uid === user.uid ? stored : user;
      if (currentUser.expiresAt <= Date.now() + 60_000) currentUser = await refreshStoredAuth(currentUser);
      if (photo) {
        const formData = new FormData();
        formData.append("file", photo);
        formData.append("folder", "urologics-profile");
        const uploadResponse = await fetch(appPath("/api/urologics/cloudinary-upload"), {
          method: "POST", headers: { Authorization: `Bearer ${currentUser.idToken}` }, body: formData,
        });
        const upload = await uploadResponse.json();
        if (!uploadResponse.ok || !upload.url) throw new Error(upload.error || "Your photo could not be uploaded. Please try again.");
        profileImageUrl = upload.url;
      }
      const response = await fetch(appPath("/api/urologics/profile"), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${currentUser.idToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ phone: savedPhone, medicalInstitution: savedInstitution, profileImageUrl }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Your profile could not be saved. Please try again.");
      queryClient.setQueryData<AccessPayload>(accountQueryKey(user.uid, ACCESS_PATH), (current) => current ? {
        ...current, profile: { ...current.profile, phone: savedPhone || null, medicalInstitution: savedInstitution || null, profileImageUrl },
      } : current);
      closeEdit();
      setProfileNotice("Your changes have been saved.");
      // A saved profile remains successful if refreshing the shared header fails.
      void refreshUser().catch(() => {});
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Your profile could not be saved. Please try again.");
    } finally { setSaving(false); }
  }

  async function sendPasswordReset() {
    if (!user || resetting) return;
    setResetError("");
    setResetNotice("");
    if (!FIREBASE_API_KEY) { setResetError("Password reset is currently unavailable. Please try again later."); return; }
    setResetting(true);
    try {
      const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_API_KEY}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestType: "PASSWORD_RESET", email: user.email }),
      });
      if (!response.ok) throw new Error("We couldn’t send the reset email. Please try again.");
      setResetNotice(`Password reset email sent to ${user.email}. Check your inbox and spam folder.`);
    } catch (error) { setResetError(error instanceof Error ? error.message : "We couldn’t send the reset email. Please try again."); }
    finally { setResetting(false); }
  }

  const courses = access?.profile?.activeCourses || [];
  const courseCount = courses.length || access?.profile?.activeCourseIds?.length || access?.entitlements?.courseIds?.length || 0;
  const planName = access?.plan?.title || access?.plan?.name;
  const rawStatus = access?.profile?.activePlanStatus?.trim().toLowerCase();
  const statusLabel = rawStatus && rawStatus !== "none"
    ? rawStatus.replace(/[_-]/g, " ").replace(/^./, (letter) => letter.toUpperCase())
    : planName ? "Enrolled" : "No plan";
  const credit = access?.vivaCredit;
  const remaining = Math.max(0, credit?.remainingMinutes ?? 0);
  const creditPercent = Math.max(0, Math.min(100, credit?.percentRemaining ?? 0));
  const dirty = phoneDraft.trim() !== phone || institutionDraft.trim() !== institution || Boolean(photo);

  return (
    <>
      <div className="account-heading">
        <h1>Your account</h1>
        <p>Manage your profile, learning access and purchases.</p>
      </div>

      <section className="account-identity" aria-label="Signed-in account">
        <RankAvatar name={user.name} src={image} className="h-12 w-12 text-base" />
        <div className="account-identity-text"><p className="account-name">{user.name}</p><p className="account-email">{user.email}</p></div>
        <button ref={editButton} type="button" className="account-button account-button-secondary" onClick={() => { beginEdit(); requestAnimationFrame(() => document.getElementById("personal-details")?.scrollIntoView({ block: "nearest", behavior: "instant" })); }} disabled={saving} aria-expanded={editing} aria-controls="personal-details"><Pencil size={15} aria-hidden="true" />Edit profile</button>
      </section>

      <div className="account-access-grid">
        <section className="account-panel" aria-labelledby="account-plan-heading">
          <div className="account-section-heading"><BookOpenCheck size={19} aria-hidden="true" /><h2 id="account-plan-heading">Your plan</h2></div>
          {accessQuery.isPending ? <SectionLoading label="Loading your plan" /> : accessQuery.isError ? (
            <AccountSectionError message="Your plan details couldn’t be loaded." onRetry={() => void accessQuery.refetch()} retrying={accessQuery.isFetching} />
          ) : (
            <>
              <div className="account-plan-title"><h3>{planName || "No plan enrolled"}</h3><span className={`account-status ${rawStatus === "active" ? "account-status-success" : rawStatus === "expired" ? "account-status-warning" : ""}`}>{statusLabel}</span></div>
              {access?.plan?.categoryName && <p className="account-muted">{access.plan.categoryName}</p>}
              <dl className="account-plan-details"><div><dt>Access ends</dt><dd>{formatDate(access?.profile?.planExpiresAt)}</dd></div><div><dt>Courses included</dt><dd>{courseCount}</dd></div></dl>
              {courses.length > 0 && <details className="account-courses"><summary>Included courses<ChevronDown size={16} aria-hidden="true" /></summary><ul>{courses.map(course => <li key={course.id}><Link href="/courses">{course.title}<ArrowRight size={14} aria-hidden="true" /></Link></li>)}</ul></details>}
              <Link href={courseCount ? "/courses" : "/plans"} className="account-text-link">{courseCount ? "Go to my courses" : "Explore plans"}<ArrowRight size={15} aria-hidden="true" /></Link>
            </>
          )}
        </section>

        <section className="account-panel" aria-labelledby="account-credit-heading">
          <div className="account-section-heading"><Clock3 size={19} aria-hidden="true" /><h2 id="account-credit-heading">AI Viva minutes</h2></div>
          {accessQuery.isPending ? <SectionLoading label="Loading your minutes" /> : accessQuery.isError ? <p className="account-muted account-credit-unavailable">Your balance is unavailable until access details can be loaded.</p> : (
            <>
              <p className="account-credit-value">{remaining.toLocaleString("en-GB", { maximumFractionDigits: 1 })}<span>minutes left</span></p>
              {credit && credit.totalMinutes > 0 ? <><div className="account-credit-track" role="progressbar" aria-label="AI Viva minutes remaining" aria-valuemin={0} aria-valuemax={100} aria-valuenow={creditPercent} aria-valuetext={`${remaining} of ${credit.totalMinutes} minutes remaining`}><span style={{ width: `${creditPercent}%` }} /></div><p className="account-muted account-credit-caption">{credit.usedMinutes} of {credit.totalMinutes} minutes used</p></> : <p className="account-muted account-credit-caption">No Viva minutes are included in your current access.</p>}
              <Link href={remaining > 0 ? "/ai-viva/cases" : "/plans"} className="account-text-link">{remaining > 0 ? "Practise a viva" : "View plans with Viva minutes"}<ArrowRight size={15} aria-hidden="true" /></Link>
            </>
          )}
        </section>
      </div>

      <section id="personal-details" className="account-panel" aria-labelledby="account-details-heading">
        <div className="account-section-heading"><h2 id="account-details-heading">Personal details</h2>{!editing && <button type="button" className="account-text-link" onClick={beginEdit}>Edit details<Pencil size={14} aria-hidden="true" /></button>}</div>
        {profileNotice && <p role="status" className="account-notice">{profileNotice}</p>}
        {editing ? (
          <form onSubmit={saveProfile} className="account-edit-form" aria-label="Edit profile">
            <fieldset disabled={saving}>
              <legend className="sr-only">Profile details</legend>
              <div className="account-photo-editor"><RankAvatar name={user.name} src={image} className="h-14 w-14 text-lg" /><div><button type="button" className="account-button account-button-secondary" onClick={() => photoInput.current?.click()}><Camera size={15} aria-hidden="true" />Change photo</button><p id="account-photo-help" className="account-field-help">JPG, PNG, WebP or GIF. Maximum 5 MB.</p><input ref={photoInput} type="file" accept={PHOTO_TYPES.join(",")} aria-label="Profile photo" aria-describedby={`account-photo-help${photoError ? " account-photo-error" : ""}`} aria-invalid={Boolean(photoError)} className="sr-only" tabIndex={-1} onChange={(event) => { changePhoto(event.target.files?.[0]); event.target.value = ""; }} /></div></div>
              {photoError && <p id="account-photo-error" className="account-field-error" role="alert">{photoError}</p>}
              <div className="account-form-fields"><label htmlFor="account-institution">Medical institution<span className="account-optional">Optional</span><input ref={institutionInput} id="account-institution" autoComplete="organization" maxLength={200} value={institutionDraft} onChange={event => setInstitutionDraft(event.target.value)} placeholder="Hospital, NHS Trust or medical college" /></label><label htmlFor="account-phone">Phone number<span className="account-optional">Optional</span><input id="account-phone" type="tel" autoComplete="tel" maxLength={40} value={phoneDraft} onChange={event => setPhoneDraft(event.target.value)} placeholder="+44 7700 900123" aria-describedby="account-phone-help" /><span id="account-phone-help" className="account-field-help">Include your country code.</span></label></div>
            </fieldset>
            {saveError && <p className="account-field-error" role="alert">{saveError}</p>}
            <div className="account-form-actions"><button type="submit" disabled={saving || !dirty || Boolean(photoError)} className="account-button account-button-primary">{saving ? "Saving…" : "Save changes"}</button><button type="button" disabled={saving} className="account-button account-button-secondary" onClick={closeEdit}>Cancel</button></div>
          </form>
        ) : (
          <dl className="account-info-list"><div><dt>Name</dt><dd>{user.name}</dd></div><div><dt>Email</dt><dd>{user.email}</dd></div><div><dt>Phone number</dt><dd className={!phone ? "account-muted" : ""}>{phone || "Not added"}</dd></div><div><dt>Medical institution</dt><dd className={!institution ? "account-muted" : ""}>{institution || "Not added"}</dd></div></dl>
        )}
      </section>

      <PurchaseHistory purchases={Array.isArray(purchasesQuery.data?.purchases) ? purchasesQuery.data.purchases : []} loading={purchasesQuery.isPending} error={purchasesQuery.isError ? "Your purchases couldn’t be loaded." : ""} onRetry={() => void purchasesQuery.refetch()} retrying={purchasesQuery.isFetching} />

      <section className="account-panel" aria-labelledby="account-security-heading">
        <div className="account-section-heading"><KeyRound size={18} aria-hidden="true" /><h2 id="account-security-heading">Security</h2></div>
        <div className="account-security-row"><div><h3>Password</h3><p className="account-muted">We’ll email you a link to reset your password.</p></div><button type="button" className="account-button account-button-secondary" disabled={resetting} onClick={sendPasswordReset}>{resetting ? "Sending…" : "Send reset email"}</button></div>
        {resetError && <p className="account-field-error" role="alert">{resetError}</p>}
        {resetNotice && <p className="account-notice" role="status">{resetNotice}</p>}
        <div className="account-security-row account-signout"><div><h3>Sign out</h3><p className="account-muted">Sign out of Urologics on this browser.</p></div><button type="button" className="account-button account-button-quiet" onClick={signOut}><LogOut size={16} aria-hidden="true" />Sign out</button></div>
      </section>

      <div className="account-footer"><span>Find your learning activity on Overview.</span><Link href="/" className="account-text-link">Go to Overview<ArrowRight size={15} aria-hidden="true" /></Link></div>
    </>
  );
}

function SectionLoading({ label }: { label: string }) {
  return <div className="account-section-loading"><GlobalLoading compact label={label} /></div>;
}
