"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
const steps = [
  "Community",
  "Branding",
  "Discord",
  "Roblox",
  "Departments",
  "Staff ranks",
  "Permissions",
  "Sessions",
  "Finish",
];
export function SetupWizard() {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({
    name: "Florida State Roleplay",
    abbreviation: "FSRP",
    description: "Roleplay like no other.",
    accent: "#5261ff",
    discordInvite: "https://discord.gg/fsrp",
    robloxGroupUrl: "https://www.roblox.com/communities/1082694446",
    schedule: "Daily around 11:30 AM. Check Discord for updates.",
    timezone: "America/New_York",
    token: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const input = (key: string, label: string, type = "text") => (
    <label key={key}>
      {label}
      <input
        type={type}
        value={values[key]}
        onChange={(e) => setValues({ ...values, [key]: e.target.value })}
        required
      />
    </label>
  );
  return (
    <div className="panel">
      <nav className="tabs" aria-label="Setup progress">
        {steps.map((s, i) => (
          <span
            className="badge"
            style={i === step ? { color: "white", background: "#374581" } : {}}
            key={s}
          >
            {i + 1}. {s}
          </span>
        ))}
      </nav>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (step < 8) {
            setStep(step + 1);
            return;
          }
          setBusy(true);
          setError("");
          try {
            const response = await fetch("/api/setup", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(values),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message);
            router.push("/");
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Setup failed.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2>{steps[step]}</h2>
        {step === 0 && (
          <>
            {input("name", "Community name")}
            {input("abbreviation", "Abbreviation")}
            {input("description", "Description")}
          </>
        )}
        {step === 1 && (
          <>
            {input("accent", "Accent color", "color")}
            <p>
              Your supplied Florida branding is installed. Change the logo and
              banner paths in Administration after setup.
            </p>
          </>
        )}
        {step === 2 && (
          <>
            {input("discordInvite", "Discord invite URL")}
            <p>
              Configure Discord OAuth and the bot using the environment
              variables in the deployment guide. Never paste credentials into
              community content.
            </p>
          </>
        )}
        {step === 3 && input("robloxGroupUrl", "Roblox group URL")}
        {step === 4 && (
          <p>
            The seed command adds the eight supplied departments. Use
            Administration → Departments and Staff workspace → Departments to
            manage descriptions, rosters, and ranks.
          </p>
        )}
        {step === 5 && (
          <p>
            Seeded roles include Ownership, Administrator, Moderator, Trial
            Moderator, Law Enforcement, Fire / EMS, and Dispatch. Customize
            permissions under Administration → Roles.
          </p>
        )}
        {step === 6 && (
          <p>
            Ownership is granted only by the server-side bootstrap command to an
            account that has already signed in through Discord. No public user
            can claim ownership through this wizard.
          </p>
        )}
        {step === 7 && (
          <>
            {input("schedule", "Session schedule")}
            {input("timezone", "IANA timezone")}
          </>
        )}
        {step === 8 && (
          <>
            {input("token", "One-time setup token", "password")}
            <p>
              Enter SETUP_TOKEN from your server environment. Completing setup
              permanently closes this public wizard.
            </p>
          </>
        )}
        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}
        <div className="form-actions">
          {step > 0 && (
            <button
              type="button"
              className="button secondary"
              onClick={() => setStep(step - 1)}
            >
              Back
            </button>
          )}
          <button className="button" disabled={busy}>
            {busy ? "Saving…" : step === 8 ? "Complete setup" : "Continue"}
          </button>
        </div>
      </form>
    </div>
  );
}
