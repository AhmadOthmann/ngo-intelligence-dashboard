import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import {
  knownLabel,
  languageOptionLabel,
  localeFromLanguage,
} from "@/lib/i18n";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Onboarding - Impact Atlas" },
      { name: "description", content: "Build your AI relevance profile." },
    ],
  }),
  component: Onboarding,
});

const STEPS = ["basics", "topics", "funding", "sources", "confirm"] as const;
const SOURCE_OPTIONS = [
  "News articles",
  "Funding calls",
  "NGO reports",
  "Emails and newsletters",
  "Peer-saved resources",
  "Public posts from similar NGOs",
  "Google Alerts",
  "RSS feeds",
];
const APPLICANT_TYPES = ["German NGO", "local NGO", "international NGO", "partner application"];
const URGENCY_OPTIONS = ["Any", "Within 3 months", "Within 6 months", "Long-term planning"];
const TOPIC_SUGGESTION_RULES = [
  { topic: "Education", terms: ["education", "school", "learning", "literacy", "teacher", "student", "classroom"] },
  { topic: "Children and youth", terms: ["children", "child", "youth", "young people", "adolescent", "student"] },
  { topic: "Girls and women", terms: ["girls", "girl", "women", "woman", "female", "empowerment", "mothers"] },
  { topic: "Health", terms: ["health", "medical", "clinic", "nutrition", "sanitation", "wash", "disease", "vaccination"] },
  { topic: "Gender-based violence", terms: ["gender-based violence", "gbv", "violence against women", "protection"] },
  { topic: "Menstrual hygiene", terms: ["menstrual", "menstruation", "period poverty", "pads", "hygiene"] },
  { topic: "Vocational training", terms: ["vocational", "skills training", "livelihood", "employment", "apprenticeship"] },
  { topic: "Humanitarian aid", terms: ["humanitarian", "emergency", "relief", "crisis", "disaster"] },
  { topic: "Refugees and migration", terms: ["refugee", "displaced", "migration", "migrant", "idp"] },
  { topic: "Rural development", terms: ["rural", "village", "community development", "livelihoods"] },
  { topic: "Animal welfare", terms: ["animal welfare", "animal", "veterinary", "donkey", "dog", "shelter", "livestock"] },
  { topic: "Wildlife protection", terms: ["wildlife", "conservation", "poaching", "biodiversity"] },
  { topic: "Rabies", terms: ["rabies", "dog bite", "dog vaccination"] },
  { topic: "Animal trade", terms: ["animal trade", "wildlife trade", "trafficking", "donkey skin", "puppy trade"] },
  { topic: "Agriculture and consumer protection", terms: ["agriculture", "farming", "farmers", "food security", "consumer protection"] },
  { topic: "Social media animal abuse", terms: ["social media animal abuse", "online animal abuse", "animal abuse content"] },
  { topic: "Funding opportunities", terms: ["funding", "grant", "donor", "proposal", "fundraising", "bmz", "foundation"] },
  { topic: "Human rights", terms: ["human rights", "rights", "advocacy", "legal support"] },
  { topic: "Climate and environment", terms: ["climate", "environment", "sustainability", "resilience"] },
  { topic: "Local security updates", terms: ["security", "conflict", "safety", "unrest"] },
  { topic: "Development cooperation", terms: ["development cooperation", "partnership", "bmz", "giz", "ngo cooperation"] },
] as const;
const TOPIC_KEYWORD_HINTS: Record<string, string[]> = {
  Education: ["education", "school attendance"],
  "Children and youth": ["children", "youth development"],
  "Girls and women": ["girls' education", "women empowerment"],
  Health: ["community health"],
  "Gender-based violence": ["GBV prevention"],
  "Menstrual hygiene": ["menstrual hygiene"],
  "Vocational training": ["vocational training", "skills training"],
  "Humanitarian aid": ["humanitarian aid"],
  "Refugees and migration": ["refugees", "migration"],
  "Rural development": ["rural development"],
  "Animal welfare": ["animal welfare"],
  "Wildlife protection": ["wildlife protection"],
  Rabies: ["rabies"],
  "Animal trade": ["wildlife trade", "animal trade"],
  "Agriculture and consumer protection": ["food security"],
  "Social media animal abuse": ["online animal abuse"],
  "Funding opportunities": ["small grants"],
  "Human rights": ["human rights"],
  "Climate and environment": ["climate resilience"],
  "Local security updates": ["local security"],
  "Development cooperation": ["development cooperation"],
};
const DEFAULT_DESCRIPTION =
  "Small NGO supporting education, girls' empowerment, and health in Burundi.";
const INITIAL_SUGGESTIONS = suggestOnboardingDefaults({
  name: "Burundi Kids",
  country: "Burundi",
  city: "Bujumbura",
  language: "German",
  website: "",
  description: DEFAULT_DESCRIPTION,
});

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
  const [description, setDescription] = useState(DEFAULT_DESCRIPTION);

  // Step 2
  const [topics, setTopics] = useState<string[]>(INITIAL_SUGGESTIONS.topics);
  const [keywords, setKeywords] = useState(INITIAL_SUGGESTIONS.keywords);
  const [profilePreview, setProfilePreview] = useState<ReturnType<typeof generateNgoProfile> | null>(null);
  const [topicsTouched, setTopicsTouched] = useState(false);
  const [keywordsTouched, setKeywordsTouched] = useState(false);

  // Step 3
  const [fundingEnabled, setFundingEnabled] = useState(true);
  const [fundingRegions, setFundingRegions] = useState<string[]>(INITIAL_SUGGESTIONS.fundingRegions);
  const [minAmt, setMinAmt] = useState("EUR 5,000");
  const [maxAmt, setMaxAmt] = useState("EUR 100,000");
  const [applicantTypes, setApplicantTypes] = useState<string[]>(INITIAL_SUGGESTIONS.applicantTypes);
  const [fundingTopics, setFundingTopics] = useState<string[]>(INITIAL_SUGGESTIONS.fundingTopics);
  const [fundingChips, setFundingChips] = useState<string[]>(INITIAL_SUGGESTIONS.fundingChips);
  const [urgency, setUrgency] = useState("Within 3 months");
  const [fundingRegionsTouched, setFundingRegionsTouched] = useState(false);
  const [applicantTypesTouched, setApplicantTypesTouched] = useState(false);
  const [fundingTopicsTouched, setFundingTopicsTouched] = useState(false);
  const [fundingChipsTouched, setFundingChipsTouched] = useState(false);

  // Step 4
  const [sources, setSources] = useState<string[]>(INITIAL_SUGGESTIONS.sources);
  const [sourcesNote, setSourcesNote] = useState("");
  const [sourcesTouched, setSourcesTouched] = useState(false);

  const suggestedDefaults = useMemo(
    () => suggestOnboardingDefaults({ name, country, city, language, website, description }),
    [name, country, city, language, website, description],
  );

  useEffect(() => {
    if (!topicsTouched) setTopics(suggestedDefaults.topics);
    if (!keywordsTouched) setKeywords(suggestedDefaults.keywords);
    if (!fundingRegionsTouched) setFundingRegions(suggestedDefaults.fundingRegions);
    if (!applicantTypesTouched) setApplicantTypes(suggestedDefaults.applicantTypes);
    if (!fundingChipsTouched) setFundingChips(suggestedDefaults.fundingChips);
    if (!sourcesTouched) setSources(suggestedDefaults.sources);
  }, [
    suggestedDefaults,
    topicsTouched,
    keywordsTouched,
    fundingRegionsTouched,
    applicantTypesTouched,
    fundingChipsTouched,
    sourcesTouched,
  ]);

  useEffect(() => {
    if (!fundingTopicsTouched) {
      setFundingTopics(topics.filter((topic) => topic !== "Local security updates").slice(0, 6));
    }
  }, [fundingTopicsTouched, topics]);

  useEffect(() => {
    setProfilePreview(null);
  }, [name, country, city, language, website, description, topics, keywords]);

  function applySuggestedDefaults() {
    setTopics(suggestedDefaults.topics);
    setKeywords(suggestedDefaults.keywords);
    setFundingRegions(suggestedDefaults.fundingRegions);
    setApplicantTypes(suggestedDefaults.applicantTypes);
    setFundingTopics(suggestedDefaults.fundingTopics);
    setFundingChips(suggestedDefaults.fundingChips);
    setSources(suggestedDefaults.sources);
    setTopicsTouched(false);
    setKeywordsTouched(false);
    setFundingRegionsTouched(false);
    setApplicantTypesTouched(false);
    setFundingTopicsTouched(false);
    setFundingChipsTouched(false);
    setSourcesTouched(false);
  }

  const fundingRegionOptions = useMemo(
    () => unique(["local", "national", "international", "Africa", "East Africa", "Burundi", country, city, ...fundingRegions]),
    [city, country, fundingRegions],
  );

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
  const copy = onboardingCopy(language);

  return (
    <div className="min-h-screen bg-secondary/40 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <div className="text-xs text-muted-foreground">
            {copy.stepCounter(step + 1, STEPS.length)}
          </div>
        </div>

        <Stepper step={step} labels={copy.stepLabels} />

        <div className="mt-6 rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-soft)]">
          {step === 0 && (
            <div className="space-y-5">
              <SectionHead title={copy.basicsTitle} subtitle={copy.basicsSubtitle} />
              <Field label={copy.organizationName}><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={copy.country}><Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder={copy.countryPlaceholder} /></Field>
                <Field label={copy.cityRegion}><Input value={city} onChange={(e) => setCity(e.target.value)} /></Field>
              </div>
              <Field label={copy.preferredLanguage}>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGE_OPTIONS.map((l) => (
                    <Chip key={l} active={language === l} onClick={() => setLanguage(l)}>
                      {languageOptionLabel(language, l)}
                    </Chip>
                  ))}
                </div>
              </Field>
              <Field label={copy.websiteLabel} hint={copy.websiteHint}>
                <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
              </Field>
              <Field label={copy.descriptionLabel}>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <SectionHead title={copy.topicsTitle} subtitle={copy.topicsSubtitle} />
              <div className="flex flex-wrap gap-2">
                {TOPIC_OPTIONS.map((t) => (
                  <Chip
                    key={t}
                    active={topics.includes(t)}
                    onClick={() => {
                      setTopicsTouched(true);
                      setTopics((p) => p.includes(t) ? p.filter((x) => x !== t) : [...p, t]);
                    }}
                  >
                    {knownLabel(language, t)}
                  </Chip>
                ))}
              </div>
              <Field label={copy.keywordsLabel} hint={copy.keywordsHint}>
                <Textarea
                  value={keywords}
                  onChange={(e) => {
                    setKeywordsTouched(true);
                    setKeywords(e.target.value);
                  }}
                  rows={3}
                  placeholder={copy.keywordsPlaceholder}
                />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={applySuggestedDefaults}>
                  <Sparkles className="h-4 w-4" /> {copy.useDescriptionSuggestions}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setProfilePreview(generateNgoProfile({ name, country, language, description, topics, keywords }))}
                >
                  <Sparkles className="h-4 w-4" /> {copy.generateAiTopicProfile}
                </Button>
              </div>
              {profilePreview && (
                <div className="rounded-xl border border-[var(--peer)]/20 bg-[var(--peer-bg)]/40 p-4 text-sm">
                  <div className="mb-2 flex items-center gap-2 font-medium text-[var(--peer)]">
                    <Sparkles className="h-4 w-4" /> {copy.aiGeneratedPreview}
                  </div>
                  <PreviewLine label={copy.detectedFocusAreas} value={localizedList(profilePreview.focusAreas, language)} />
                  <PreviewLine label={copy.detectedRegions} value={localizedList(profilePreview.regions, language)} />
                  <PreviewLine label={copy.suggestedExtraKeywords} value={localizedList(profilePreview.suggestedKeywords, language)} />
                  <div className="mt-2 text-xs text-muted-foreground">{copy.refineLater}</div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <SectionHead title={copy.fundingTitle} subtitle={copy.fundingSubtitle} />
              <div className="flex items-center justify-between rounded-xl border border-border p-4">
                <div>
                  <div className="text-sm font-medium">{copy.receiveFunding}</div>
                  <div className="text-xs text-muted-foreground">{copy.receiveFundingHint}</div>
                </div>
                <Switch checked={fundingEnabled} onCheckedChange={setFundingEnabled} />
              </div>
              {fundingEnabled && (
                <>
                  <Field label={copy.fundingRegions}>
                    <div className="flex flex-wrap gap-2">
                      {fundingRegionOptions.map((r) => (
                        <Chip
                          key={r}
                          active={fundingRegions.includes(r)}
                          onClick={() => {
                            setFundingRegionsTouched(true);
                            setFundingRegions((p) => p.includes(r) ? p.filter((x) => x !== r) : [...p, r]);
                          }}
                        >
                          {knownLabel(language, r)}
                        </Chip>
                      ))}
                    </div>
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={copy.minimumFundingAmount}><Input value={minAmt} onChange={(e) => setMinAmt(e.target.value)} /></Field>
                    <Field label={copy.maximumFundingAmount}><Input value={maxAmt} onChange={(e) => setMaxAmt(e.target.value)} /></Field>
                  </div>
                  <Field label={copy.applicantType}>
                    <div className="flex flex-wrap gap-2">
                      {APPLICANT_TYPES.map((a) => (
                        <Chip
                          key={a}
                          active={applicantTypes.includes(a)}
                          onClick={() => {
                            setApplicantTypesTouched(true);
                            setApplicantTypes((p) => p.includes(a) ? p.filter((x) => x !== a) : [...p, a]);
                          }}
                        >
                          {knownLabel(language, a)}
                        </Chip>
                      ))}
                    </div>
                  </Field>
                  <Field label={copy.topicsForFunding}>
                    <div className="flex flex-wrap gap-2">
                      {topics.map((t) => (
                        <Chip
                          key={t}
                          active={fundingTopics.includes(t)}
                          onClick={() => {
                            setFundingTopicsTouched(true);
                            setFundingTopics((p) => p.includes(t) ? p.filter((x) => x !== t) : [...p, t]);
                          }}
                        >
                          {knownLabel(language, t)}
                        </Chip>
                      ))}
                    </div>
                  </Field>
                  <Field label={copy.fundingTags}>
                    <div className="flex flex-wrap gap-2">
                      {FUNDING_CHIPS.map((c) => (
                        <Chip
                          key={c}
                          active={fundingChips.includes(c)}
                          onClick={() => {
                            setFundingChipsTouched(true);
                            setFundingChips((p) => p.includes(c) ? p.filter((x) => x !== c) : [...p, c]);
                          }}
                        >
                          {knownLabel(language, c)}
                        </Chip>
                      ))}
                    </div>
                  </Field>
                  <Field label={copy.deadlineUrgency}>
                    <div className="flex flex-wrap gap-2">
                      {URGENCY_OPTIONS.map((u) => (
                        <Chip key={u} active={urgency === u} onClick={() => setUrgency(u)}>
                          {knownLabel(language, u)}
                        </Chip>
                      ))}
                    </div>
                  </Field>
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <SectionHead title={copy.sourcesTitle} subtitle={copy.sourcesSubtitle} />
              <div className="grid gap-2 sm:grid-cols-2">
                {SOURCE_OPTIONS.map((s) => (
                  <label key={s} className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm">
                    <Checkbox
                      checked={sources.includes(s)}
                      onCheckedChange={(c) => {
                        setSourcesTouched(true);
                        setSources((p) => c ? [...p, s] : p.filter((x) => x !== s));
                      }}
                    />
                    {knownLabel(language, s)}
                  </label>
                ))}
              </div>
              <Field label={copy.sourcesNoteLabel}>
                <Textarea value={sourcesNote} onChange={(e) => setSourcesNote(e.target.value)} rows={3} />
              </Field>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <SectionHead title={copy.confirmTitle} subtitle={copy.confirmSubtitle} />
              <div className="rounded-xl border border-border bg-secondary/40 p-5 text-sm">
                <ProfileRow label={copy.organization} value={finalProfile.name} />
                <ProfileRow label={copy.country} value={finalProfile.country} />
                <ProfileRow label={copy.preferredLanguage} value={languageOptionLabel(language, finalProfile.language)} />
                <ProfileRow label={copy.regions} value={localizedList(finalProfile.regions, language)} />
                <ProfileRow label={copy.topics} value={localizedList(finalProfile.topics, language)} />
                {finalProfile.fundingPrefs?.enabled && (
                  <ProfileRow label={copy.fundingInterests} value={localizedList([...finalProfile.fundingPrefs.chips, ...finalProfile.fundingPrefs.regions], language)} />
                )}
                <ProfileRow label={copy.recommendedSignalTypes} value={localizedList(finalProfile.sources ?? [], language)} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setStep(0)}>
                  <Edit className="h-4 w-4" /> {copy.editProfile}
                </Button>
                <Button
                  onClick={() => {
                    setProfile(finalProfile);
                    navigate({ to: "/app/inbox" });
                  }}
                >
                  <Check className="h-4 w-4" /> {copy.createSignalInbox}
                </Button>
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-between border-t border-border pt-5">
            <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>{copy.back}</Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)}>{copy.continue}</Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stepper({ step, labels }: { step: number; labels: readonly string[] }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((key, i) => (
        <div key={key} className="flex flex-1 items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium ${
              i <= step ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"
            }`}
          >
            {i + 1}
          </div>
          <span className={`hidden text-xs font-medium sm:block ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>
            {labels[i]}
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

function localizedList(items: string[], language: string): string {
  return items.length ? items.map((item) => knownLabel(language, item)).join(", ") : "-";
}

function onboardingCopy(language: string) {
  const locale = localeFromLanguage(language);
  if (locale === "fr") {
    return {
      aiGeneratedPreview: "Apercu du profil genere par IA",
      applicantType: "Type de candidat",
      back: "Retour",
      basicsSubtitle: "Dites-nous qui vous etes. Cela determine les signaux que vous verrez.",
      basicsTitle: "Informations de base sur l'organisation",
      cityRegion: "Ville / region",
      confirmSubtitle: "Voici ce qu'Impact Atlas utilisera pour router les signaux vers vous.",
      confirmTitle: "Votre profil de pertinence IA",
      continue: "Continuer",
      country: "Pays",
      countryPlaceholder: "ex. Burundi",
      createSignalInbox: "Creer ma boite de signaux",
      deadlineUrgency: "Preference d'urgence des echeances",
      descriptionLabel: "Description courte de l'organisation",
      detectedFocusAreas: "Axes detectes",
      detectedRegions: "Regions detectees",
      editProfile: "Modifier le profil",
      fundingInterests: "Interets de financement",
      fundingRegions: "Regions de financement",
      fundingSubtitle: "Afficher seulement les financements adaptes a votre eligibilite et capacite.",
      fundingTags: "Tags de financement",
      fundingTitle: "Preferences de financement",
      generateAiTopicProfile: "Generer le profil thematique IA",
      keywordsHint: "Separe par des virgules. Aide l'IA a capter les termes locaux.",
      keywordsLabel: "Ajouter vos propres mots-cles ou themes",
      keywordsPlaceholder:
        "Burundi, Bujumbura, Gitega, education des filles, financement BMZ, petites subventions",
      maximumFundingAmount: "Montant maximum",
      minimumFundingAmount: "Montant minimum",
      organization: "Organisation",
      organizationName: "Nom de l'organisation",
      preferredLanguage: "Langue preferee",
      receiveFunding: "Recevoir des opportunites de financement",
      receiveFundingHint: "Recevez des appels a financement adaptes dans votre boite.",
      recommendedSignalTypes: "Types de signaux recommandes",
      refineLater: "Vous pourrez affiner cela dans les prochaines etapes.",
      regions: "Regions",
      sourcesNoteLabel:
        "Collez les flux RSS, mots-cles Google Alert ou sites que vous suivez deja (facultatif)",
      sourcesSubtitle: "Mixez les sources. Vous pourrez en ajouter plus tard.",
      sourcesTitle: "Quelles sources devons-nous surveiller ?",
      stepCounter: (current: number, total: number) => `Etape ${current} sur ${total}`,
      stepLabels: ["Bases", "Themes", "Financement", "Sources", "Confirmation"],
      suggestedExtraKeywords: "Mots-cles supplementaires suggeres",
      topics: "Themes",
      topicsForFunding: "Themes pour le financement",
      topicsSubtitle: "Selectionnez tout ce qui correspond. Vous pourrez changer cela plus tard.",
      topicsTitle: "Quels themes comptent pour votre travail ?",
      useDescriptionSuggestions: "Utiliser les suggestions de la description",
      websiteHint:
        "Si vous ajoutez votre site, l'IA comprendra mieux votre mission, vos regions, vos themes et vos besoins de financement.",
      websiteLabel: "URL du site web (facultatif)",
    };
  }
  if (locale === "de") {
    return {
      aiGeneratedPreview: "KI-generierte Profilvorschau",
      applicantType: "Antragstellertyp",
      back: "Zurueck",
      basicsSubtitle: "Sagen Sie uns, wer Sie sind. Das bestimmt, welche Signale Sie sehen.",
      basicsTitle: "Grunddaten der Organisation",
      cityRegion: "Stadt / Region",
      confirmSubtitle: "Das nutzt Impact Atlas, um Signale an Sie weiterzuleiten.",
      confirmTitle: "Ihr KI-Relevanzprofil",
      continue: "Weiter",
      country: "Land",
      countryPlaceholder: "z. B. Burundi",
      createSignalInbox: "Mein Signal-Postfach erstellen",
      deadlineUrgency: "Praeferenz fuer Frist-Dringlichkeit",
      descriptionLabel: "Kurze Organisationsbeschreibung",
      detectedFocusAreas: "Erkannte Schwerpunkte",
      detectedRegions: "Erkannte Regionen",
      editProfile: "Profil bearbeiten",
      fundingInterests: "Foerderinteressen",
      fundingRegions: "Foerderregionen",
      fundingSubtitle: "Nur Foerderungen anzeigen, die zu Ihrer Eignung und Kapazitaet passen.",
      fundingTags: "Foerder-Tags",
      fundingTitle: "Foerderpraeferenzen",
      generateAiTopicProfile: "KI-Themenprofil generieren",
      keywordsHint: "Durch Kommas getrennt. Hilft der KI, lokale Begriffe zu erkennen.",
      keywordsLabel: "Eigene Stichwoerter oder Themen hinzufuegen",
      keywordsPlaceholder:
        "Burundi, Bujumbura, Gitega, Maedchenbildung, BMZ-Foerderung, kleine Zuschuesse",
      maximumFundingAmount: "Hoechstbetrag",
      minimumFundingAmount: "Mindestbetrag",
      organization: "Organisation",
      organizationName: "Name der Organisation",
      preferredLanguage: "Bevorzugte Sprache",
      receiveFunding: "Foerdermoeglichkeiten erhalten",
      receiveFundingHint: "Passende Foerderaufrufe im Postfach erhalten.",
      recommendedSignalTypes: "Empfohlene Signaltypen",
      refineLater: "Sie koennen dies in den naechsten Schritten verfeinern.",
      regions: "Regionen",
      sourcesNoteLabel:
        "RSS-Feeds, Google-Alert-Stichwoerter oder Websites einfuegen, die Sie bereits beobachten (optional)",
      sourcesSubtitle: "Kombinieren Sie Quellen. Sie koennen spaeter mehr hinzufuegen.",
      sourcesTitle: "Welche Quellen sollen wir beobachten?",
      stepCounter: (current: number, total: number) => `Schritt ${current} von ${total}`,
      stepLabels: ["Basis", "Themen", "Foerderung", "Quellen", "Bestaetigen"],
      suggestedExtraKeywords: "Vorgeschlagene zusaetzliche Stichwoerter",
      topics: "Themen",
      topicsForFunding: "Themen fuer Foerderung",
      topicsSubtitle: "Waehlen Sie alles aus, was passt. Sie koennen dies spaeter aendern.",
      topicsTitle: "Welche Themen sind fuer Ihre Arbeit wichtig?",
      useDescriptionSuggestions: "Vorschlaege aus der Beschreibung nutzen",
      websiteHint:
        "Wenn Sie Ihre Website hinzufuegen, versteht die KI Ihre Mission, Regionen, Themen und Foerderbedarfe besser.",
      websiteLabel: "Website-URL (optional)",
    };
  }
  return {
    aiGeneratedPreview: "AI-generated profile preview",
    applicantType: "Applicant type",
    back: "Back",
    basicsSubtitle: "Tell us who you are. This shapes the signals you'll see.",
    basicsTitle: "Basic organization information",
    cityRegion: "City / region",
    confirmSubtitle: "This is what Impact Atlas will use to route signals to you.",
    confirmTitle: "Your AI Relevance Profile",
    continue: "Continue",
    country: "Country",
    countryPlaceholder: "e.g. Burundi",
    createSignalInbox: "Create my Signal Inbox",
    deadlineUrgency: "Deadline urgency preference",
    descriptionLabel: "Short organization description",
    detectedFocusAreas: "Detected focus areas",
    detectedRegions: "Detected regions",
    editProfile: "Edit profile",
    fundingInterests: "Funding interests",
    fundingRegions: "Funding regions",
    fundingSubtitle: "Only show funding that fits your eligibility and capacity.",
    fundingTags: "Funding tags",
    fundingTitle: "Funding preferences",
    generateAiTopicProfile: "Generate AI topic profile",
    keywordsHint: "Comma-separated. Helps AI catch local terms.",
    keywordsLabel: "Add your own keywords or topics",
    keywordsPlaceholder:
      "Burundi, Bujumbura, Gitega, girls' education, BMZ funding, small grants",
    maximumFundingAmount: "Maximum funding amount",
    minimumFundingAmount: "Minimum funding amount",
    organization: "Organization",
    organizationName: "Organization name",
    preferredLanguage: "Preferred language",
    receiveFunding: "Receive funding opportunities",
    receiveFundingHint: "Get matched funding calls in your inbox.",
    recommendedSignalTypes: "Recommended signal types",
    refineLater: "You can refine this in the next steps.",
    regions: "Regions",
    sourcesNoteLabel:
      "Paste RSS feeds, Google Alert keywords, or websites you already monitor (optional)",
    sourcesSubtitle: "Mix and match. You can add more later.",
    sourcesTitle: "What sources should we monitor?",
    stepCounter: (current: number, total: number) => `Step ${current} of ${total}`,
    stepLabels: ["Basics", "Topics", "Funding", "Sources", "Confirm"],
    suggestedExtraKeywords: "Suggested extra keywords",
    topics: "Topics",
    topicsForFunding: "Topics for funding",
    topicsSubtitle: "Pick everything that fits. You can change this later.",
    topicsTitle: "What topics matter to your work?",
    useDescriptionSuggestions: "Use description suggestions",
    websiteHint:
      "If you add your website, AI can better understand your mission, regions, topics, and funding needs.",
    websiteLabel: "Website URL (optional)",
  };
}

interface SuggestionInput {
  name: string;
  country: string;
  city: string;
  language: string;
  website: string;
  description: string;
}

interface SuggestedDefaults {
  topics: string[];
  keywords: string;
  fundingRegions: string[];
  applicantTypes: string[];
  fundingTopics: string[];
  fundingChips: string[];
  sources: string[];
}

function suggestOnboardingDefaults(input: SuggestionInput): SuggestedDefaults {
  const text = normalizeText(
    [input.name, input.country, input.city, input.language, input.website, input.description].join(" "),
  );
  const matchedTopics = TOPIC_SUGGESTION_RULES
    .filter((rule) => rule.terms.some((term) => text.includes(term)))
    .map((rule) => rule.topic)
    .filter((topic) => TOPIC_OPTIONS.includes(topic));
  const topics = unique(matchedTopics).slice(0, 7);
  const selectedTopics = topics.length ? topics : ["Development cooperation", "Funding opportunities"];
  const country = cleanLabel(input.country);
  const city = cleanLabel(input.city);
  const germanContext = hasAny(text, ["german", "germany", "deutsch", "bmz", "giz", ".de"]);
  const eastAfricaContext = hasAny(text, [
    "east africa",
    "burundi",
    "rwanda",
    "uganda",
    "kenya",
    "tanzania",
    "great lakes",
  ]);
  const animalContext = selectedTopics.some((topic) =>
    ["Animal welfare", "Wildlife protection", "Rabies", "Animal trade", "Social media animal abuse"].includes(topic),
  );
  const womenContext = selectedTopics.some((topic) =>
    ["Girls and women", "Gender-based violence", "Menstrual hygiene"].includes(topic),
  );
  const healthContext = selectedTopics.some((topic) => ["Health", "Rabies"].includes(topic));
  const educationContext = selectedTopics.some((topic) =>
    ["Education", "Children and youth", "Vocational training"].includes(topic),
  );
  const humanitarianContext = selectedTopics.some((topic) =>
    ["Humanitarian aid", "Refugees and migration"].includes(topic),
  );
  const developmentContext = selectedTopics.some((topic) =>
    ["Rural development", "Climate and environment", "Development cooperation"].includes(topic),
  );

  const keywordHints = selectedTopics.flatMap((topic) => TOPIC_KEYWORD_HINTS[topic] ?? []);
  const keywords = unique([
    country,
    city,
    text.includes("burundi") ? "Gitega" : "",
    eastAfricaContext ? "Great Lakes Region" : "",
    ...keywordHints,
    germanContext ? "BMZ funding" : "",
    selectedTopics.includes("Funding opportunities") ? "small grants" : "",
  ])
    .slice(0, 12)
    .join(", ");

  const fundingRegions = unique([
    eastAfricaContext ? "Africa" : "",
    eastAfricaContext ? "East Africa" : "",
    country,
  ]);
  const applicantTypes = unique([
    germanContext ? "German NGO" : "",
    country && !germanContext ? "local NGO" : "local NGO",
    "partner application",
  ]);
  const fundingTopics = selectedTopics
    .filter((topic) => topic !== "Local security updates")
    .slice(0, 6);
  const fundingChips = unique([
    "Small project funding",
    germanContext ? "BMZ" : "",
    "Foundations",
    educationContext ? "Education funding" : "",
    healthContext ? "Health funding" : "",
    animalContext ? "Animal welfare funding" : "",
    humanitarianContext ? "Emergency aid" : "",
    womenContext ? "Women and girls" : "",
    developmentContext ? "Development cooperation" : "",
    country || eastAfricaContext ? "Local partner required" : "",
    germanContext ? "German applicant eligible" : "",
  ]).filter((chip) => FUNDING_CHIPS.includes(chip));
  const sources = unique([
    "News articles",
    "Funding calls",
    hasAny(text, ["report", "research", "data", "evaluation"]) ? "NGO reports" : "",
    hasAny(text, ["partner", "network", "peer", "coalition"]) ? "Peer-saved resources" : "",
    hasAny(text, ["social media", "public posts", "online"]) ? "Public posts from similar NGOs" : "",
    hasAny(text, ["newsletter", "rss", "google alert"]) ? "RSS feeds" : "",
  ]);

  return {
    topics: selectedTopics,
    keywords,
    fundingRegions,
    applicantTypes,
    fundingTopics,
    fundingChips,
    sources,
  };
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function cleanLabel(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function hasAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}
