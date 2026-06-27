# NGO Signals Normalized Dataset

## Purpose

This folder contains the frontend-ready normalized news and signal dataset for two NGO profiles:

- `burundikids`
- `welttierschutzgesellschaft`

The dataset is intentionally independent from UI components. A frontend or backend can read the JSON file and map fields into its own card, feed, saved-item, or API models without editing hard-coded UI data.

## Files

- `ngo_signals.normalized.json`: merged dataset for all NGO profiles. Use this as the main integration file.
- `burundikids.normalized.json`: Burundikids-only normalized records.
- `welttierschutzgesellschaft.normalized.json`: welttierschutzgesellschaft-only normalized records.
- `README.md`: schema and integration guide.

Expected current record counts:

- Merged dataset: 98 records
- `burundikids`: 48 records
- `welttierschutzgesellschaft`: 50 records

## Top-level merged schema

`ngo_signals.normalized.json` has this shape:

```json
{
  "metadata": {
    "datasetName": "ngo_signals.normalized",
    "version": "1.0.0",
    "description": "Frontend-ready normalized signal dataset for Burundikids and welttierschutzgesellschaft",
    "generatedAt": "ISO timestamp",
    "sourceFolder": "data_prep",
    "recordCount": 98,
    "profiles": ["burundikids", "welttierschutzgesellschaft"]
  },
  "profiles": [
    { "id": "burundikids", "displayName": "Burundikids" },
    { "id": "welttierschutzgesellschaft", "displayName": "welttierschutzgesellschaft" }
  ],
  "signals": []
}
```

## Required signal fields

Every signal should contain:

- `id`: stable unique record ID, for example `burundikids-001`.
- `ngoUser`: exact profile ID.
- `title`: source-supported headline/title.
- `sourceName`: publisher or organization name.
- `sourceType`: normalized content/source category.
- `originalUrl`: preserved original source URL.
- `date`: verified publication date in `YYYY-MM-DD`, or `null` when unavailable.
- `dateUnknown`: `true` when `date` is missing.
- `dateVerificationStatus`: `verified`, `unverified`, or `future_date_review`.
- `country`: country most relevant to the signal.
- `region`: broader region.
- `location`: display-friendly location.
- `tags`: NGO-specific tag array.
- `urgency`: normalized urgency level.
- `cardSummary`: short card-ready summary.
- `keyInformationSummary`: source-supported key facts.
- `convertibleProjectDirection`: practical project or response angle.
- `projectFitReason`: why the signal is relevant to the NGO profile.
- `confidenceLevel`: confidence in extracted/enriched information.
- `accessStatus`: whether original source content was accessible.
- `summarySource`: where the summary facts came from.

## Useful optional fields

Records may also include:

- `displayDate`: human-readable source date when available.
- `dateSource`: where the publication date was found.
- `dateVerificationNote`: explanation for uncertain or corrected dates.
- `detailedSummary`: longer source-supported summary.
- `sourceUrl`: fallback URL field, if present.
- `geography`: fallback geographic text, if present.
- `summary`: fallback summary, if present.
- `confidenceNotes`: additional QA notes, if present.

## Accepted values

Allowed `ngoUser` values:

- `burundikids`
- `welttierschutzgesellschaft`

Allowed `urgency` values:

- `urgent`
- `high`
- `medium`
- `low`
- `unknown`

Common `sourceType` values:

- `news_article`
- `humanitarian_report`
- `institutional_report`
- `research_report`
- `ngo_update`
- `funding_call`
- `video_social_signal`
- `other`

Allowed `dateVerificationStatus` values:

- `verified`: publication date was found in the source page, source metadata, or a clear source URL date.
- `unverified`: no safe publication date could be confirmed.
- `future_date_review`: the discovered date is after the validation date and needs human review.

Allowed `confidenceLevel` values:

- `high`
- `medium`
- `low`

Allowed `accessStatus` values:

- `available`
- `unavailable`
- `partial`

## NGO-specific tags

Recommended Burundikids tags:

- `children`
- `education`
- `child_protection`
- `public_health`
- `food_security`
- `displacement`
- `climate_shock`
- `emergency_response`
- `funding`
- `policy`
- `school_meals`
- `nutrition`

Recommended welttierschutzgesellschaft tags:

- `animal_welfare`
- `veterinary_care`
- `livestock`
- `stray_animals`
- `wildlife`
- `animal_health`
- `disaster_response`
- `food_security`
- `zoonotic_disease`
- `policy`
- `funding`
- `community_resilience`

## Minimal frontend integration

Use `ngo_signals.normalized.json` as the single source of truth. Do not paste records directly into UI components.

Example TypeScript loader:

```ts
import data from "../data_prep/processed/ngo_signals.normalized.json";

export function getAllSignals() {
  return data.signals;
}

export function getSignalsForProfile(profileId: string) {
  return data.signals.filter((signal) => signal.ngoUser === profileId);
}

export function getSignalById(id: string) {
  return data.signals.find((signal) => signal.id === id);
}
```

If the frontend bundler cannot import JSON from `data_prep`, copy the merged file into the smallest appropriate app data directory and document the source path. Keep `data_prep/processed/ngo_signals.normalized.json` as the canonical source.

## Recommended field mapping for cards

Map normalized fields into the local UI model with safe fallbacks:

- Card ID: `id`
- NGO/profile filter: `ngoUser`
- Title: `title`
- Source label: `sourceName`
- Content type: map `sourceType`
- Link: `originalUrl`
- Date: `displayDate || date`; if missing, show `Date unavailable`
- Location: `location || geography || region || country`
- Tags: `tags`
- Urgency: `urgency`
- Short summary: `cardSummary || summary || keyInformationSummary`
- Long summary: `detailedSummary || keyInformationSummary`
- Project direction: `convertibleProjectDirection`
- Fit reason: `projectFitReason`

Suggested display type mapping:

- `funding_call` -> `funding`
- `humanitarian_report`, `institutional_report`, `research_report` -> `report`
- all other values -> `news`

## Date handling rules

Do not invent publication dates. A record with `date: null` is valid when no safe source publication date was found.

Recommended UI fallback:

- `dateVerificationStatus: "future_date_review"` -> `Date under review`
- `date: null` or `dateUnknown: true` -> `Date unavailable`
- `dateVerificationStatus: "unverified"` with no date -> `Date unavailable`
- `dateVerificationStatus: "unverified"` with a date -> `Date unverified`
- `dateVerificationStatus: "verified"` -> show `displayDate` or formatted `date`

## How to add a record

1. Add the record to the NGO-specific normalized file first.
2. Use a stable ID with the NGO prefix, for example `burundikids-049`.
3. Preserve `originalUrl` exactly.
4. Use only source-supported facts in summaries and project-fit fields.
5. Fill required fields, including date verification fields.
6. Rebuild or update `ngo_signals.normalized.json` so the merged file stays in sync.
7. Validate unique IDs and record counts.

## How to update summaries

- Base every claim on either the prepared source table or the original source page.
- Do not infer dates from report periods, forecast periods, event periods, or titles.
- If a source page cannot be accessed, set or keep `accessStatus: "unavailable"` and use `summarySource: "data_prep"`.
- If only partial source information is available, use conservative summaries and lower `confidenceLevel`.
- Preserve original URLs and stable IDs so saved-item behavior does not break.

## Validation checklist

Before using or committing updates, check:

- JSON parses successfully.
- Merged `metadata.recordCount` equals `signals.length`.
- IDs are unique across both NGOs.
- Every `ngoUser` is one of the allowed values.
- Every record has `originalUrl`.
- `tags` is an array.
- `urgency` uses an allowed value.
- `cardSummary` is non-empty.
- `convertibleProjectDirection` is non-empty.
- `dateUnknown` is `true` when `date` is `null`.
- NGO-specific files and merged file contain matching records for shared IDs.

## Notes for another Codex agent

If you are integrating this into another collaborator's local checkout, start with the merged file and build a thin adapter. Avoid editing visual card components unless the app has no data service layer. Keep profile filtering based on `ngoUser`, keep links clickable through `originalUrl`, and preserve IDs exactly for saved-item compatibility.
