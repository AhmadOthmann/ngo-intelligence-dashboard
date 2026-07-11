# 3-minute demo script

## Before presenting

Use a disposable local database. Copy `.env.example` to `.env`, keep `APP_ENV=development`, and confirm `ENABLE_DEMO_ENDPOINTS=true`. Start the backend and frontend:

```bash
uvicorn backend.main:app --reload
```

```bash
cd frontend
npm ci
npm run dev
```

Open <http://127.0.0.1:5173>. Do not present this as a production deployment, account system, or tenant-specific product.

## 0:00–0:30 — Problem

“Small NGO teams cannot manually monitor every source, funding call, and risk update in multiple languages. Impact Atlas turns that scattered material into a focused intelligence workflow.”

On the landing page, point out the **Hackathon demo** label. Enter the default demo workspace. If you configure a custom profile instead, explain that it is stored only in this browser and currently changes presentation, not backend ranking.

## 0:30–1:00 — Load a repeatable dataset

Open **Dashboard** and select **Load Local Demo Data**.

“This deliberately resets the disposable SQLite database and loads five fixed Burundi Kids and WTG examples. It gives us a repeatable demonstration without relying on external sites.”

Do not use this control with real data. If it reports that the operation is unavailable, verify the local demo flag; production always returns `404` for this endpoint.

## 1:00–1:50 — Turn sources into actions

Open **Signal Inbox** and point out its data-source label. It must say whether the list is backed by the API or by static demo fixtures. If the backend cannot be reached, show the visible error rather than describing fallback fixtures as live data.

Open a signal and show:

- the source and summary;
- the relevance score and reason;
- the target NGO and suggested action; and
- the funding flag or deadline where present.

“The backend classifies and prioritizes these records for the two hackathon partner profiles, Burundi Kids and WTG. A profile typed into onboarding does not yet retrain or reconfigure that analysis.”

## 1:50–2:25 — Translation with an honest fallback

Translate a signal into German or French.

- If OpenAI is configured, describe it as model-assisted translation.
- Otherwise, point to the **Translation preview** label and say: “No translation provider is configured, so this is a local preview, not a translated result.”

Never claim that marked preview text is a provider translation.

## 2:25–2:50 — Briefing

Return to **Dashboard**, review the refreshed briefing, and show the priorities, funding opportunities, recommended actions, and risk alerts.

“The aim is not another news feed. It is a short, reviewable list of what an NGO team should verify and act on next.”

## 2:50–3:00 — Close and next steps

“This is a working hackathon MVP with real ingestion, SQLite persistence, analysis, filtering, and provider-conditional translation. Accounts, custom tenant configuration, saved items, and peer chat remain demo experiences. The next production steps are authentication and tenant isolation, managed storage, scheduled jobs, evaluation, monitoring, and network egress controls.”

## Optional live-network segment

Use **Update Intelligence** only when the presentation has extra time and approved sources are reachable. Live RSS and web ingestion is intentionally less repeatable. Outbound requests are URL- and DNS-validated, size-limited, and allowlisted in production, but a hosted service still needs an egress firewall to cover DNS rebinding.
