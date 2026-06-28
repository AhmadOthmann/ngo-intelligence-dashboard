import type { Conversation, NgoProfile, Signal } from "./types";

export const BURUNDI_KIDS: NgoProfile = {
  id: "burundi-kids",
  name: "Burundi Kids",
  country: "Burundi",
  city: "Bujumbura",
  language: "German",
  website: "https://burundikids.example.org",
  description:
    "Small NGO supporting education, girls' empowerment, and health in Burundi.",
  topics: [
    "Education",
    "Children and youth",
    "Girls and women",
    "Health",
    "Vocational training",
    "Gender-based violence",
  ],
  keywords: ["Burundi", "Bujumbura", "Gitega", "Gateri", "Great Lakes Region"],
  focusAreas: [
    "Education",
    "Girls' empowerment",
    "Children and youth",
    "Health",
    "Burundi",
    "Small NGO funding",
  ],
  regions: ["Burundi", "Bujumbura", "Gitega", "Gateri", "Great Lakes Region"],
  suggestedKeywords: [
    "GBV Burundi",
    "school attendance",
    "vocational training",
    "malaria",
    "German NGO funding",
    "East Africa",
  ],
  fundingPrefs: {
    enabled: true,
    regions: ["Africa", "East Africa", "Burundi"],
    min: "€5,000",
    max: "€100,000",
    applicantTypes: ["German NGO", "local NGO"],
    fundingTopics: ["Education", "Health", "Girls and women"],
    chips: ["Small project funding", "BMZ", "Education funding", "German applicant eligible"],
    urgency: "Within 3 months",
  },
  sources: ["News articles", "Funding calls", "Peer-saved resources", "NGO reports"],
};

export const WTG: NgoProfile = {
  id: "wtg",
  name: "WTG",
  country: "Germany",
  city: "Berlin",
  language: "German",
  description:
    "German NGO focused on animal welfare, wildlife protection, and consumer protection.",
  topics: [
    "Animal welfare",
    "Wildlife protection",
    "Rabies",
    "Animal trade",
    "Agriculture and consumer protection",
    "Social media animal abuse",
  ],
  keywords: ["Germany", "East Africa", "wildlife trade"],
  focusAreas: ["Animal welfare", "Wildlife protection", "Consumer protection"],
  regions: ["Germany", "East Africa", "Global"],
  suggestedKeywords: ["rabies control", "CITES", "wildlife trafficking", "BMZ animal welfare"],
  fundingPrefs: {
    enabled: true,
    regions: ["international", "Africa"],
    applicantTypes: ["German NGO", "international NGO"],
    fundingTopics: ["Animal welfare", "Development cooperation"],
    chips: ["Animal welfare funding", "Development cooperation", "German applicant eligible"],
  },
  sources: ["News articles", "Funding calls", "RSS feeds"],
};

export const FEATURED_INBOX_SIGNAL: Signal = {
  id: "recadec-great-lakes-generation",
  priority: "urgent",
  type: "news",
  title: "A new generation ready to transform the Great Lakes Region",
  source: "RECADEC East Africa",
  date: "4 March 2026",
  originalLanguage: "English",
  summary:
    "RECADEC launched the Academy of Champions of Hope in Bujumbura, bringing young people from Burundi, DRC, and Rwanda into a one-year entrepreneurship and leadership program for peacebuilding and regional transformation.",
  longSummary:
    "The Academy of Champions of Hope opened its first cohort in Bujumbura with 30 young participants from Burundi, the Democratic Republic of Congo, and Rwanda. The program combines entrepreneurship training, leadership development, and regional cooperation so young people can build practical projects that support peace and economic resilience across the Great Lakes region.",
  keyPoints: [
    "Launched in Bujumbura with youth from Burundi, DRC, and Rwanda",
    "Focuses on entrepreneurship, leadership, peacebuilding, and regional cooperation",
    "Relevant for education, youth empowerment, and Great Lakes partner networks",
  ],
  aiImportance: "urgent",
  whyRecommended:
    "Strong match for Burundi Kids because it combines Burundi, youth empowerment, education, vocational skills, and Great Lakes regional cooperation.",
  peerActivity: [{ text: "Relevant to NGOs working with youth in the Great Lakes Region" }],
  suggestedAction:
    "Review for potential youth entrepreneurship partners, field contacts, or proposal evidence around regional youth leadership.",
  url: "https://recadec.org/en/a-new-generation-ready-to-transform-the-great-lakes-region/",
};

export const DEMO_SIGNALS: Signal[] = [
  FEATURED_INBOX_SIGNAL,
  {
    id: "sig-1",
    priority: "relevant",
    type: "funding",
    title: "Small-grant opportunity for girls' education in East Africa",
    source: "Foundation newsletter",
    date: "27 June 2026",
    originalLanguage: "English",
    summary:
      "This funding opportunity supports education and empowerment projects for girls in East Africa. Burundi-related projects may fit the regional focus. The funder requires a local implementation partner, so eligibility should be checked before applying.",
    longSummary:
      "A new small-grant cycle from the East Africa Education Foundation targets girls' education and empowerment projects across East Africa. Grants range from €10,000 to €50,000 for projects up to 18 months. German and European NGOs may apply if they partner with a registered local organization in the implementation country. Burundi is explicitly named as a priority country for the 2026 cycle.",
    aiImportance: "important",
    whyRecommended:
      "Matches your profile: Burundi, education, girls and youth development. Two similar NGOs saved this opportunity. One NGO added it to their funding pipeline.",
    peerActivity: [
      { text: "Saved by 2 similar NGOs" },
      { text: "Added to digest by 1 NGO working in East Africa" },
    ],
    suggestedAction:
      "Check eligibility and ask the peer NGO about their application experience.",
    funding: {
      deadline: "15 August 2026",
      amount: "€10,000–€50,000",
      funder: "East Africa Education Foundation",
      eligibility: "German NGOs may be eligible, local partner required",
      canApply: "check",
    },
    url: "#",
  },
  {
    id: "sig-2",
    priority: "urgent",
    type: "news",
    title: "Burundi: security and humanitarian update for Bujumbura province",
    source: "ReliefWeb",
    date: "26 June 2026",
    originalLanguage: "French",
    summary:
      "Local authorities report displaced families in Bujumbura province. Humanitarian access remains possible but partners should coordinate movements.",
    longSummary:
      "ReliefWeb reports that several hundred families have been displaced across Bujumbura province following heavy rains and localized unrest. Humanitarian corridors remain open, and local authorities are coordinating with UN agencies. NGOs operating in the region are asked to coordinate field movements through the established cluster system to avoid disruption.",
    keyPoints: [
      "Displacements concentrated in three communes near Bujumbura",
      "Humanitarian access is open but requires coordination",
      "Local cluster meetings resuming weekly from 28 June",
      "Health and shelter are the most urgent sector needs",
    ],
    aiImportance: "urgent",
    whyRecommended:
      "Matches your region: Burundi, Bujumbura. Marked urgent due to humanitarian impact on your operating area.",
    peerActivity: [{ text: "Clicked by 5 NGOs working in the Great Lakes Region" }],
    suggestedAction: "Review with your local team and update field movement plans.",
    url: "#",
  },
  {
    id: "sig-3",
    priority: "relevant",
    type: "report",
    title: "Malaria and school absence in Burundi: 2026 field report",
    source: "Health partner consortium",
    date: "20 June 2026",
    originalLanguage: "French",
    summary:
      "New report links rising malaria cases to school absenteeism in rural Burundi. Suggests low-cost prevention measures schools can adopt.",
    longSummary:
      "A 60-page field report from a consortium of health partners documents a measurable correlation between seasonal malaria peaks and school absenteeism in rural Burundi. Drawing on data from 42 schools, the report recommends low-cost school-based prevention measures including bednet distribution, classroom screening, and rapid referral pathways with nearby health centers.",
    keyPoints: [
      "42 schools surveyed across rural Burundi",
      "Absence rate climbs 18% during peak malaria season",
      "Bednet distribution + referral pathways recommended",
      "Estimated cost: €4–€7 per child per year",
    ],
    aiImportance: "medium",
    whyRecommended:
      "Matches your topics: health, education, Burundi. Useful evidence for funding proposals.",
    peerActivity: [{ text: "Saved by an NGO you may want to follow" }],
    suggestedAction: "Save to Field Intelligence to support upcoming proposals.",
    url: "#",
  },
  {
    id: "sig-4",
    priority: "info",
    type: "news",
    title: "Rabies control progress across East Africa",
    source: "WHO regional brief",
    date: "18 June 2026",
    originalLanguage: "English",
    summary:
      "Vaccination campaigns in East Africa show measurable drops in rabies incidence. Cross-border coordination remains the key challenge.",
    longSummary:
      "The WHO regional brief reviews five years of dog-vaccination campaigns across East Africa. Reported rabies cases fell by an average of 38% in districts that sustained 70%+ vaccination coverage. The brief flags cross-border movement of unvaccinated dogs as the main residual risk and proposes joint Kenya–Tanzania–Uganda corridors for 2026–2027.",
    keyPoints: [
      "Cases down 38% in high-coverage districts",
      "Cross-border dog movement is the main residual risk",
      "Proposed Kenya–Tanzania–Uganda vaccination corridors",
    ],
    aiImportance: "low",
    whyRecommended:
      "Matches WTG profile: rabies, animal welfare, East Africa.",
    peerActivity: [{ text: "Clicked by 5 NGOs working on animal welfare" }],
    suggestedAction: "Add to digest for monthly review.",
    url: "#",
  },
  {
    id: "sig-5",
    priority: "urgent",
    type: "news",
    title: "Wildlife trafficking update: new trade routes identified",
    source: "TRAFFIC bulletin",
    date: "25 June 2026",
    originalLanguage: "English",
    summary:
      "Investigators report new trafficking routes between East Africa and European markets. Calls for stronger consumer-side enforcement.",
    longSummary:
      "A TRAFFIC bulletin maps two emerging wildlife trafficking corridors connecting East African source countries to consumer markets in Western Europe. Investigators document a shift from air freight to mixed road-and-sea routing via Mediterranean ports. The report calls on European NGOs and regulators to focus on consumer-side enforcement and supply-chain audits of luxury goods.",
    keyPoints: [
      "Two new corridors documented since late 2025",
      "Shift from air freight to road + Mediterranean sea routes",
      "Calls for consumer-side enforcement in EU markets",
    ],
    aiImportance: "important",
    whyRecommended:
      "Matches WTG profile: wildlife protection, animal trade, consumer protection.",
    peerActivity: [{ text: "Saved by 3 similar NGOs" }],
    suggestedAction: "Share with policy team and consider a public response.",
    url: "#",
  },
  {
    id: "sig-6",
    priority: "info",
    type: "peer",
    title: "Animal welfare field note shared by partner NGO",
    source: "Peer NGO: Animal Welfare East Africa",
    date: "22 June 2026",
    originalLanguage: "English",
    summary:
      "Partner NGO shared a short field note on stray dog management programs in Kenya, including budget breakdown.",
    aiImportance: "medium",
    whyRecommended:
      "Shared by an NGO that overlaps with your topics. Recommended because this NGO shares your region and topics.",
    peerActivity: [{ text: "Saved by 2 similar NGOs" }],
    suggestedAction: "Save and consider replying with your own field experience.",
    url: "#",
  },
  {
    id: "sig-7",
    priority: "relevant",
    type: "funding",
    title: "BMZ-style funding call for small NGOs: 2026 cycle",
    source: "BMZ partner portal",
    date: "24 June 2026",
    originalLanguage: "German",
    summary:
      "Funding cycle open for small German NGOs implementing projects with local partners in Africa. Education, health, and women's empowerment prioritized.",
    longSummary:
      "The BMZ small-NGO facility has opened its 2026 funding cycle. The instrument supports German NGOs with annual turnover under €1.5M implementing 12–36 month projects with a registered local partner in Africa. Education, health, and women's empowerment are this cycle's stated priority areas. Concept notes are reviewed monthly until the cycle closes.",
    aiImportance: "urgent",
    whyRecommended:
      "Strong match: German applicant eligible, small grants, Africa, education, health.",
    peerActivity: [{ text: "Added to digest by 1 similar NGO" }],
    suggestedAction: "Start eligibility check and draft a concept note.",
    funding: {
      deadline: "30 September 2026",
      amount: "€25,000–€200,000",
      funder: "BMZ small-NGO facility",
      eligibility: "German NGO, local partner required",
      canApply: "yes",
    },
    url: "#",
  },
  {
    id: "sig-8",
    priority: "info",
    type: "report",
    title: "Rapport de projet: éducation des filles à Gitega",
    source: "Local partner",
    date: "15 June 2026",
    originalLanguage: "French",
    summary:
      "Project report from Gitega describes outcomes of a one-year girls' education program: attendance up 22%, dropout down 11%.",
    longSummary:
      "A 12-month project report from a local partner in Gitega documents the outcomes of an after-school program for adolescent girls. Attendance rose by 22% and dropout fell by 11% over the program year. The report includes per-school cost data and a short methodology section that NGOs can adapt for donor proposals.",
    keyPoints: [
      "Attendance +22%, dropout −11% over 12 months",
      "Per-school cost data included",
      "Methodology reusable for proposal annexes",
    ],
    aiImportance: "medium",
    whyRecommended: "Direct evidence from your region. Useful for donor reporting.",
    suggestedAction: "Save to Field Intelligence for proposal evidence.",
    url: "#",
  },
];

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

export const DEMO_CONVERSATIONS: Conversation[] = [
  {
    id: "c1",
    orgName: "Education Bridge Rwanda",
    country: "Rwanda",
    sharedTopics: ["Education", "Girls and women", "Funding"],
    translationStatus: "Auto-translating FR ↔ DE",
    messages: [
      {
        id: "m1",
        sender: "me",
        originalText:
          "Hallo, wir haben gesehen, dass ihr diese Fördermöglichkeit für Mädchenbildung gespeichert habt. Habt ihr bereits geprüft, ob deutsche NGOs antragsberechtigt sind?",
        originalLang: "DE",
        translatedText:
          "Bonjour, nous avons vu que vous avez enregistre cette opportunite de financement pour l'education des filles. Avez-vous deja verifie si les ONG allemandes peuvent deposer une demande?",
        targetLang: "FR",
        timestamp: "09:14",
        sentAt: minutesAgo(180),
      },
      {
        id: "m2",
        sender: "peer",
        originalText:
          "Bonjour, nous avons vérifié les critères. Il semble qu'un partenaire local soit obligatoire, mais une organisation allemande peut être coordinatrice.",
        originalLang: "FR",
        translatedText:
          "Hallo, wir haben die Kriterien geprüft. Es sieht so aus, als sei ein lokaler Partner verpflichtend, aber eine deutsche Organisation kann koordinieren.",
        targetLang: "DE",
        timestamp: "10:02",
        sentAt: minutesAgo(12),
      },
    ],
  },
  {
    id: "c2",
    orgName: "Health Action Burundi",
    country: "Burundi",
    sharedTopics: ["Health", "Children and youth"],
    translationStatus: "Same language (FR)",
    messages: [],
  },
  {
    id: "c3",
    orgName: "Animal Welfare East Africa",
    country: "Kenya",
    sharedTopics: ["Animal welfare", "Wildlife protection"],
    translationStatus: "Auto-translating EN ↔ DE",
    messages: [],
  },
  {
    id: "c4",
    orgName: "Local Partner Burundi",
    country: "Burundi",
    sharedTopics: ["Education", "Vocational training"],
    translationStatus: "Auto-translating FR ↔ DE",
    messages: [],
  },
];

export const TOPIC_OPTIONS = [
  "Education",
  "Children and youth",
  "Girls and women",
  "Health",
  "Gender-based violence",
  "Menstrual hygiene",
  "Vocational training",
  "Humanitarian aid",
  "Refugees and migration",
  "Rural development",
  "Animal welfare",
  "Wildlife protection",
  "Rabies",
  "Animal trade",
  "Agriculture and consumer protection",
  "Social media animal abuse",
  "Funding opportunities",
  "Human rights",
  "Climate and environment",
  "Local security updates",
  "Development cooperation",
];

export const FUNDING_CHIPS = [
  "Small project funding",
  "BMZ",
  "Foundations",
  "Education funding",
  "Health funding",
  "Animal welfare funding",
  "Emergency aid",
  "Women and girls",
  "Development cooperation",
  "Local partner required",
  "German applicant eligible",
];

export const LANGUAGE_OPTIONS = ["German", "English", "French"];
