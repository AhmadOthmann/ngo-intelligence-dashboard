import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Building2, Globe, Pencil, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppState } from "@/lib/app-state";
import { knownLabel, localeFromLanguage, translate } from "@/lib/i18n";
import type { NgoProfile } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/app/profile")({
  head: () => ({ meta: [{ title: "Profile - Impact Atlas" }] }),
  component: ProfilePage,
});

const ALL_SOURCES = [
  "News articles",
  "Funding calls",
  "NGO reports",
  "Emails and newsletters",
  "Peer-saved resources",
  "Public posts from similar NGOs",
  "Google Alerts",
  "RSS feeds",
];

function ProfilePage() {
  const { profile, setProfile } = useAppState();
  const language = profile?.language;
  const copy = profileCopy(language);
  const [editOpen, setEditOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const p = profile;
  const initials = useMemo(
    () => (p?.name ?? "NG").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase(),
    [p?.name],
  );

  if (!p) {
    return <div className="px-5 py-8 text-sm text-muted-foreground">{copy.loadingProfile}</div>;
  }

  const regenerate = async () => {
    setRegenerating(true);
    await new Promise((r) => setTimeout(r, 1400));
    setProfile({
      ...p,
      suggestedKeywords: Array.from(
        new Set([...(p.suggestedKeywords ?? []), "donor coordination", "local partner"]),
      ),
    });
    setRegenerating(false);
    toast.success(copy.aiProfileRefreshed);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-5 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {translate(language, "profile")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{copy.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" /> {copy.editProfile}
          </Button>
          <Button onClick={regenerate} disabled={regenerating}>
            <Sparkles className="h-4 w-4" />
            {regenerating ? copy.regenerating : copy.regenerateAiProfile}
          </Button>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-semibold text-primary-foreground">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-semibold text-foreground">{p.name}</div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" /> {p.country}
                {p.city ? ` / ${p.city}` : ""}
              </span>
              <span>/</span>
              <span>{copy.language}: {p.language}</span>
              {p.website && (
                <>
                  <span>/</span>
                  <a
                    href={p.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <Globe className="h-3.5 w-3.5" /> {p.website.replace(/^https?:\/\//, "")}
                  </a>
                </>
              )}
            </div>
            {p.description && (
              <p className="mt-3 text-sm leading-relaxed text-foreground/80">{p.description}</p>
            )}
          </div>
        </div>
      </section>

      <Card title={copy.topicsKeywords}>
        <ChipBlock label={knownLabel(language, "Selected topics")} items={p.topics} language={language} tone="primary" />
        <ChipBlock label={copy.customKeywords} items={p.keywords} language={language} />
        <ChipBlock label={knownLabel(language, "Detected AI topics")} items={p.focusAreas} language={language} tone="primary" />
        <ChipBlock label={knownLabel(language, "Detected regions")} items={p.regions} language={language} />
      </Card>

      <Card title={copy.fundingPreferences}>
        <Row label={copy.receivesFundingOpportunities} value={p.fundingPrefs?.enabled ? copy.yes : copy.no} />
        <Row label={copy.fundingRegions} value={localizedList(p.fundingPrefs?.regions, language)} />
        <Row label={copy.minimumAmount} value={p.fundingPrefs?.min || "-"} />
        <Row label={copy.maximumAmount} value={p.fundingPrefs?.max || "-"} />
        <Row label={copy.applicantType} value={localizedList(p.fundingPrefs?.applicantTypes, language)} />
        <Row label={copy.fundingTopics} value={localizedList(p.fundingPrefs?.fundingTopics, language)} />
      </Card>

      <Card title={copy.sourcePreferences}>
        <div className="grid gap-2 sm:grid-cols-2">
          {ALL_SOURCES.map((src) => {
            const on = p.sources?.includes(src);
            return (
              <div
                key={src}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${
                  on ? "border-primary/30 bg-primary/5 text-foreground" : "border-border bg-card text-foreground/70"
                }`}
              >
                <span>{knownLabel(language, src)}</span>
                <span className={`text-[11px] font-medium ${on ? "text-primary" : "text-muted-foreground"}`}>
                  {on ? copy.on : copy.off}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      <EditProfileDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        profile={p}
        language={language}
        onSave={(next) => {
          setProfile(next);
          setEditOpen(false);
          toast.success(copy.profileUpdated);
        }}
      />
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function ChipBlock({
  label,
  items,
  language,
  tone,
}: {
  label: string;
  items: string[];
  language: string | undefined;
  tone?: "primary";
}) {
  return (
    <div>
      <div className="mb-1.5 text-xs text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.length === 0 && <span className="text-xs text-muted-foreground">-</span>}
        {items.map((i) => (
          <span
            key={i}
            className={`rounded-full px-2.5 py-1 text-xs ${
              tone === "primary"
                ? "bg-primary/10 text-primary"
                : "bg-secondary text-foreground/80"
            }`}
          >
            {knownLabel(language, i)}
          </span>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2 last:border-b-0 last:pb-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function EditProfileDialog({
  open,
  onOpenChange,
  profile,
  language,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profile: NgoProfile;
  language: string | undefined;
  onSave: (next: NgoProfile) => void;
}) {
  const copy = profileCopy(language);
  const [form, setForm] = useState(profile);
  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (v) setForm(profile); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.editProfile}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label={copy.organizationName}>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={copy.country}>
              <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </Field>
            <Field label={copy.city}>
              <Input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={copy.language}>
              <Input value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} />
            </Field>
            <Field label={copy.website}>
              <Input value={form.website ?? ""} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            </Field>
          </div>
          <Field label={copy.description}>
            <textarea
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full rounded-md border border-border bg-card p-2 text-sm"
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{translate(language, "cancel")}</Button>
          <Button onClick={() => onSave(form)}>{copy.saveChanges}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function localizedList(items: string[] | undefined, language: string | undefined): string {
  return items?.length ? items.map((item) => knownLabel(language, item)).join(", ") : "-";
}

function profileCopy(language: string | undefined) {
  const locale = localeFromLanguage(language);
  if (locale === "fr") {
    return {
      aiProfileRefreshed: "Profil IA actualise",
      applicantType: "Type de candidat",
      city: "Ville",
      country: "Pays",
      customKeywords: "Mots-cles personnalises",
      description: "Description",
      editProfile: "Modifier le profil",
      fundingPreferences: "Preferences de financement",
      fundingRegions: "Regions de financement",
      fundingTopics: "Themes de financement",
      language: "Langue",
      loadingProfile: "Chargement du profil...",
      maximumAmount: "Montant maximum",
      minimumAmount: "Montant minimum",
      no: "Non",
      off: "Desactive",
      on: "Active",
      organizationName: "Nom de l'organisation",
      profileUpdated: "Profil mis a jour",
      receivesFundingOpportunities: "Recoit des opportunites de financement",
      regenerateAiProfile: "Regenerer le profil IA",
      regenerating: "Regeneration...",
      saveChanges: "Sauvegarder",
      sourcePreferences: "Preferences de sources",
      subtitle: "Ce qu'Impact Atlas sait de votre ONG et comment il vous route les signaux.",
      topicsKeywords: "Themes et mots-cles",
      website: "Site web",
      yes: "Oui",
    };
  }
  if (locale === "de") {
    return {
      aiProfileRefreshed: "KI-Profil aktualisiert",
      applicantType: "Antragstellertyp",
      city: "Stadt",
      country: "Land",
      customKeywords: "Eigene Stichwoerter",
      description: "Beschreibung",
      editProfile: "Profil bearbeiten",
      fundingPreferences: "Foerderpraeferenzen",
      fundingRegions: "Foerderregionen",
      fundingTopics: "Foerderthemen",
      language: "Sprache",
      loadingProfile: "Profil wird geladen...",
      maximumAmount: "Hoechstbetrag",
      minimumAmount: "Mindestbetrag",
      no: "Nein",
      off: "Aus",
      on: "An",
      organizationName: "Name der Organisation",
      profileUpdated: "Profil aktualisiert",
      receivesFundingOpportunities: "Erhaelt Foerdermoeglichkeiten",
      regenerateAiProfile: "KI-Profil neu generieren",
      regenerating: "Wird neu generiert...",
      saveChanges: "Aenderungen speichern",
      sourcePreferences: "Quellenpraeferenzen",
      subtitle: "Was Impact Atlas ueber Ihre NGO weiss und wie Signale zu Ihnen geleitet werden.",
      topicsKeywords: "Themen und Stichwoerter",
      website: "Website",
      yes: "Ja",
    };
  }
  return {
    aiProfileRefreshed: "AI profile refreshed",
    applicantType: "Applicant type",
    city: "City",
    country: "Country",
    customKeywords: "Custom keywords",
    description: "Description",
    editProfile: "Edit Profile",
    fundingPreferences: "Funding preferences",
    fundingRegions: "Funding regions",
    fundingTopics: "Funding topics",
    language: "Language",
    loadingProfile: "Loading profile...",
    maximumAmount: "Maximum amount",
    minimumAmount: "Minimum amount",
    no: "No",
    off: "Off",
    on: "On",
    organizationName: "Organization name",
    profileUpdated: "Profile updated",
    receivesFundingOpportunities: "Receives funding opportunities",
    regenerateAiProfile: "Regenerate AI Profile",
    regenerating: "Regenerating...",
    saveChanges: "Save changes",
    sourcePreferences: "Source preferences",
    subtitle: "What Impact Atlas knows about your NGO and how it routes signals to you.",
    topicsKeywords: "Topics & keywords",
    website: "Website",
    yes: "Yes",
  };
}
