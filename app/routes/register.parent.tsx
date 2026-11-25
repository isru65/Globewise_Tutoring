import React, { useState } from "react";
import { Link, useNavigate } from "react-router";
import { DEEP_BLUE_THEME } from "../design-system.js";

export default function ParentRegisterRoute() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    if (!consentAccepted) {
      setErrorMessage(
        "Please accept the parental consent and privacy notice to continue.",
      );
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/v1/auth/register-parent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          timezone: timezone.trim() || "America/New_York",
          consentAccepted,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        setErrorMessage(
          payload?.error?.message || "Could not complete parent registration.",
        );
        return;
      }

      const redirectTo =
        typeof payload?.data?.redirectTo === "string"
          ? payload.data.redirectTo
          : "/students";
      navigate(redirectTo, { replace: true });
    } catch {
      setErrorMessage("Network error while creating account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col justify-center items-center px-4 py-10"
      style={{ backgroundColor: DEEP_BLUE_THEME.colors.ice50 }}
    >
      <div
        className="w-full max-w-lg rounded-2xl border bg-white overflow-hidden"
        style={{
          borderColor: DEEP_BLUE_THEME.colors.border,
          boxShadow: DEEP_BLUE_THEME.shadows.modal,
        }}
      >
        <div
          className="px-6 py-5 text-white space-y-1"
          style={{ backgroundColor: DEEP_BLUE_THEME.colors.navy950 }}
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-sky-300">
            {DEEP_BLUE_THEME.brand.name}
          </span>
          <h1 className="text-xl font-bold">Parent Account Registration</h1>
          <p className="text-xs text-blue-100/80">
            Create your parent account to link students, upload weekly school syllabi,
            and manage tutoring schedules and subscriptions.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div
              role="alert"
              className="rounded-lg border px-3.5 py-2.5 text-xs font-medium"
              style={{
                backgroundColor: DEEP_BLUE_THEME.colors.dangerBg,
                borderColor: "#FECACA",
                color: DEEP_BLUE_THEME.colors.dangerText,
              }}
            >
              {errorMessage}
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="parent-name"
              className="block text-xs font-semibold"
              style={{ color: DEEP_BLUE_THEME.colors.textPrimary }}
            >
              Full Name
            </label>
            <input
              id="parent-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jordan Taylor"
              className="w-full rounded-lg border px-3.5 py-2 text-sm"
              style={{ borderColor: DEEP_BLUE_THEME.colors.borderStrong }}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="parent-email"
              className="block text-xs font-semibold"
              style={{ color: DEEP_BLUE_THEME.colors.textPrimary }}
            >
              Email Address
            </label>
            <input
              id="parent-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="parent@example.com"
              className="w-full rounded-lg border px-3.5 py-2 text-sm"
              style={{ borderColor: DEEP_BLUE_THEME.colors.borderStrong }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="parent-phone"
                className="block text-xs font-semibold"
                style={{ color: DEEP_BLUE_THEME.colors.textPrimary }}
              >
                Phone (Optional)
              </label>
              <input
                id="parent-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555-0140"
                className="w-full rounded-lg border px-3.5 py-2 text-sm"
                style={{ borderColor: DEEP_BLUE_THEME.colors.borderStrong }}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="parent-timezone"
                className="block text-xs font-semibold"
                style={{ color: DEEP_BLUE_THEME.colors.textPrimary }}
              >
                IANA Timezone
              </label>
              <input
                id="parent-timezone"
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="America/New_York"
                className="w-full rounded-lg border px-3.5 py-2 text-sm"
                style={{ borderColor: DEEP_BLUE_THEME.colors.borderStrong }}
              />
            </div>
          </div>

          <label className="flex items-start gap-2.5 pt-1 text-xs leading-relaxed">
            <input
              type="checkbox"
              checked={consentAccepted}
              onChange={(e) => setConsentAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded"
            />
            <span style={{ color: DEEP_BLUE_THEME.colors.textSecondary }}>
              I confirm I am a parent or legal guardian and consent to student profile
              and learning data processing under Globewise privacy and child-safety
              standards.
            </span>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
            style={{ backgroundColor: DEEP_BLUE_THEME.colors.royal700 }}
          >
            {submitting ? "Creating Parent Account..." : "Create Parent Account"}
          </button>

          <div
            className="pt-2 border-t text-center text-xs"
            style={{
              borderColor: DEEP_BLUE_THEME.colors.border,
              color: DEEP_BLUE_THEME.colors.textSecondary,
            }}
          >
            Already registered?{" "}
            <Link
              to="/login/parent"
              className="font-semibold underline"
              style={{ color: DEEP_BLUE_THEME.colors.royal700 }}
            >
              Sign in to Parent Portal
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}