import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, Edit, Sparkles } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { FUNDING_CHIPS, LANGUAGE_OPTIONS, TOPIC_OPTIONS } from "@/lib/demo-data";
import { generateNgoProfile } from "@/lib/ai-mock";
import { useAppState } from "@/lib/app-state";
import type { NgoProfile } from "@/lib/types";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Onboarding — FieldSignal AI" },
      { name: "description", content: "Build your AI relevance profile." },
    ],
  }),
  component: Onboarding,
});

const STEPS = ["Basics", "Topics", "Funding", "Sources", "Confirm"];

function Onboarding() {
  const navigate = useNavigate();
  const { setProfile } = useAppState();
  const [step, setStep] = useState(0);

  // Step 1
  const [name, setName] = useState("Burundi Kids");
  const [country, setCountry] = useState("Burundi");
  const [city, setCity] = useState("Bujumbura");
  const [language, setLanguage] = useState("German");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState(
    "Small NGO supporting education, girls' empowerment, and health in Burundi.",
  );

  // Step 2
  const [topics, setTopics] = useState<string[]>([
    "Education",
    "Children and youth",
    "Girls and women",
    "Health",
  ]);
  const [keywords, setKeywords] = useState("Burundi, Bujumbura, Gitega, girls' education, BMZ funding");
  const [profilePreview, setProfilePreview] = useState<ReturnType<typeof generateNgoProfile> | null>(null);

  // Step 3
  const [fundingEnabled, setFundingEnabled] = useState(true);
  const [fundingRegions, setFundingRegions] = useState<string[]>(["Africa", "East Africa", "Burundi"]);
  const [minAmt, setMinAmt] = useState("€5,000");
  const [maxAmt, setMaxAmt] = useState("€100,000");
  const [applicantTypes, setApplicantTypes] = useState<string[]>(["German NGO", "local NGO"]);
  const [fundingTopics, setFundingTopics] = useState<string[]>(["Education", "Health"]);
  const [fundingChips, setFundingChips] = useState<string[]>([
    "Small project funding",
    "BMZ",
    "German applicant eligible",
  ]);
  const [urgency, setUrgency] = useState("Within 3 months");

  // Step 4
  const [sources, setSources] = useState<string[]>([
    "News articles",
    "Funding calls",
    "Peer-saved resources",
  ]);
  const [sourcesNote, setSourcesNote] = useState("");

  const finalProfile: NgoProfile = useMemo(() => {
    const ai = profilePreview ?? generateNgoProfile({ name, country, language, description, topics, keywords });
    return {
      id: "user-ngo",
      name,
      country,
      city,
      language,
      website,
      description,
      topics,
      keywords: keywords.split(/[,\n]/).map((s) => s.trim()).filter(Boolean),
      focusAreas: ai.focusAreas,
      regions: ai.regions,
      suggestedKeywords: ai.suggestedKeywords,
      fundingPrefs: {
        enabled: fundingEnabled,
        regions: fundingRegions,
        min: minAmt,
        max: maxAmt,
        applicantTypes,
        fundingTopics,
        chips: fundingChips,
        urgency,
      },
      sources,
      sourcesNote,
    };
  }, [profilePreview, name, country, city, language, website, description, topics, keywords, fundingEnabled, fundingRegions, minAmt, maxAmt, applicantTypes, fundingTopics, fundingChips, urgency, sources, sourcesNote]);

  return (
    <div className="min-h-screen bg-secondary/40 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <div className="text-xs text-muted-foreground">
            Step {step + 1} of {STEPS.length}
          </div>
        </div>

        <Stepper step={step} />

        <div className="mt-6 rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-soft)]">
          {step === 0 && (
            <div className="space-y-5">
              <SectionHead title="Basic organization information" subtitle="Tell us who you are. This shapes the signals you'll see." />
              <Field label="Organization name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Country"><Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. Burundi" /></Field>
                <Field label="City / region"><Input value={city} onChange={(e) => setCity(e.target.value)} /></Field>
              </div>
              <Field label="Preferred language">
                <div className="flex flex-wrap gap-2">
                  {LANGUAGE_OPTIONS.map((l) => (
                    <Chip key={l} active={language === l} onClick={() => setLanguage(l)}>{l}</Chip>
                  ))}
                </div>
              </Field>
              <Field label="Website URL (optional)" hint="If you add your website, AI can better understand your mission, regions, topics, and funding needs.">
                <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
              </Field>
              <Field label="Short organization description">
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <SectionHead title="What topics matter to your work?" subtitle="Pick everything that fits. You can change this later." />
              <div className="flex flex-wrap gap-2">
                {TOPIC_OPTIONS.map((t) => (
                  <Chip key={t} active={topics.includes(t)} onClick={() => setTopics((p) => p.includes(t) ? p.filter((x) => x !== t) : [...p, t])}>{t}</Chip>
                ))}
              </div>
              <Field label="Add your own keywords or topics" hint="Comma-separated. Helps AI catch local terms.">
                <Textarea
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  rows={3}
                  placeholder="Burundi, Bujumbura, Gitega, Gateri, Great Lakes Region, girls' education, BMZ funding, small grants, rabies, wildlife trade…"
                />
              </Field>
              <div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setProfilePreview(generateNgoProfile({ name, country, language, description, topics, keywords }))}
                >
                  <Sparkles className="h-4 w-4" /> Generate AI topic profile
                </Button>
              </div>
              {profilePreview && (
                <div className="rounded-xl border border-[var(--peer)]/20 bg-[var(--peer-bg)]/40 p-4 text-sm">
                  <div className="mb-2 flex items-center gap-2 font-medium text-[var(--peer)]">
                    <Sparkles className="h-4 w-4" /> AI-generated profile preview
                  </div>
                  <PreviewLine label="Detected focus areas" value={profilePreview.focusAreas.join(", ")} />
                  <PreviewLine label="Detected regions" value={profilePreview.regions.join(", ")} />
                  <PreviewLine label="Suggested extra keywords" value={profilePreview.suggestedKeywords.join(", ")} />
                  <div className="mt-2 text-xs text-muted-foreground">You can refine this in the next steps.</div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <SectionHead title="Funding preferences" subtitle="Only show funding that fits your eligibility and capacity." />
              <div className="flex items-center justify-between rounded-xl border border-border p-4">
                <div>
                  <div className="text-sm font-medium">Receive funding opportunities</div>
                  <div className="text-xs text-muted-foreground">Get matched funding calls in your inbox.</div>
                </div>
                <Switch checked={fundingEnabled} onCheckedChange={setFundingEnabled} />
              </div>
              {fundingEnabled && (
                <>
                  <Field label="Funding regions">
                    <div className="flex flex-wrap gap-2">
                      {["local", "national", "international", "Africa", "East Africa", "Burundi"].map((r) => (
                        <Chip key={r} active={fundingRegions.includes(r)} onClick={() => setFundingRegions((p) => p.includes(r) ? p.filter((x) => x !== r) : [...p, r])}>{r}</Chip>
                      ))}
                    </div>
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Minimum funding amount"><Input value={minAmt} onChange={(e) => setMinAmt(e.target.value)} /></Field>
                    <Field label="Maximum funding amount"><Input value={maxAmt} onChange={(e) => setMaxAmt(e.target.value)} /></Field>
                  </div>
                  <Field label="Applicant type">
                    <div className="flex flex-wrap gap-2">
                      {["German NGO", "local NGO", "international NGO", "partner application"].map((a) => (
                        <Chip key={a} active={applicantTypes.includes(a)} onClick={() => setApplicantTypes((p) => p.includes(a) ? p.filter((x) => x !== a) : [...p, a])}>{a}</Chip>
                      ))}
                    </div>
                  </Field>
                  <Field label="Topics for funding">
                    <div className="flex flex-wrap gap-2">
                      {topics.map((t) => (
                        <Chip key={t} active={fundingTopics.includes(t)} onClick={() => setFundingTopics((p) => p.includes(t) ? p.filter((x) => x !== t) : [...p, t])}>{t}</Chip>
                      ))}
                    </div>
                  </Field>
                  <Field label="Funding tags">
                    <div className="flex flex-wrap gap-2">
                      {FUNDING_CHIPS.map((c) => (
                        <Chip key={c} active={fundingChips.includes(c)} onClick={() => setFundingChips((p) => p.includes(c) ? p.filter((x) => x !== c) : [...p, c])}>{c}</Chip>
                      ))}
                    </div>
                  </Field>
                  <Field label="Deadline urgency preference">
                    <div className="flex flex-wrap gap-2">
                      {["Any", "Within 3 months", "Within 6 months", "Long-term planning"].map((u) => (
                        <Chip key={u} active={urgency === u} onClick={() => setUrgency(u)}>{u}</Chip>
                      ))}
                    </div>
                  </Field>
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <SectionHead title="What sources should we monitor?" subtitle="Mix and match. You can add more later." />
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  "News articles",
                  "Funding calls",
                  "NGO reports",
                  "Emails and newsletters",
                  "Peer-saved resources",
                  "Public posts from similar NGOs",
                  "Google Alerts",
                  "RSS feeds",
                ].map((s) => (
                  <label key={s} className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm">
                    <Checkbox
                      checked={sources.includes(s)}
                      onCheckedChange={(c) => setSources((p) => c ? [...p, s] : p.filter((x) => x !== s))}
                    />
                    {s}
                  </label>
                ))}
              </div>
              <Field label="Paste RSS feeds, Google Alert keywords, or websites you already monitor (optional)">
                <Textarea value={sourcesNote} onChange={(e) => setSourcesNote(e.target.value)} rows={3} />
              </Field>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <SectionHead title="Your AI Relevance Profile" subtitle="This is what FieldSignal will use to route signals to you." />
              <div className="rounded-xl border border-border bg-secondary/40 p-5 text-sm">
                <ProfileRow label="Organization" value={finalProfile.name} />
                <ProfileRow label="Country" value={finalProfile.country} />
                <ProfileRow label="Preferred language" value={finalProfile.language} />
                <ProfileRow label="Regions" value={finalProfile.regions.join(", ")} />
                <ProfileRow label="Topics" value={finalProfile.topics.join(", ")} />
                {finalProfile.fundingPrefs?.enabled && (
                  <ProfileRow label="Funding interests" value={[...finalProfile.fundingPrefs.chips, ...finalProfile.fundingPrefs.regions].join(", ")} />
                )}
                <ProfileRow label="Recommended signal types" value={(finalProfile.sources ?? []).join(", ")} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setStep(0)}>
                  <Edit className="h-4 w-4" /> Edit profile
                </Button>
                <Button
                  onClick={() => {
                    setProfile(finalProfile);
                    navigate({ to: "/app/inbox" });
                  }}
                >
                  <Check className="h-4 w-4" /> Create my Signal Inbox
                </Button>
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-between border-t border-border pt-5">
            <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)}>Continue</Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => (
        <div key={label} className="flex flex-1 items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium ${
              i <= step ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"
            }`}
          >
            {i + 1}
          </div>
          <span className={`hidden text-xs font-medium sm:block ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>
            {label}
          </span>
          {i < STEPS.length - 1 && <div className={`h-px flex-1 ${i < step ? "bg-primary" : "bg-border"}`} />}
        </div>
      ))}
    </div>
  );
}

function SectionHead({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground/80 hover:border-primary/40"
      }`}
    >
      {children}
    </button>
  );
}

function PreviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-1">
      <span className="font-medium text-foreground">{label}: </span>
      <span className="text-foreground/80">{value}</span>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 py-1.5">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium text-foreground">{value}</div>
    </div>
  );
}