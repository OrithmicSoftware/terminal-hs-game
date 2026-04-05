/**
 * Mission 1 interactive spear-phish authoring (Orion Logistics scenario).
 * Players pick From, Subject, then Body (linked to chosen subject) separately.
 * Scoring: each pick has a verdict (strong / weak / risky) worth 2 / 1 / 0 points. Max 6.
 */

/** @typedef {{ verdict: "strong" | "weak" | "risky", lines: string[], history?: { label: string; detail: string } }} PhishFeedback */

/** @typedef {{ label: string, feedback: PhishFeedback }} PhishOption */

/** @type {PhishOption[]} */
export const PHISHING_FROM = [
  {
    label: "sso-noreply@corp-orion.net",
    feedback: {
      verdict: "risky",
      lines: [
        "A lookalike corporate hostname is classic typosquatting. The envelope can look \u201cclose enough\u201d at a glance.",
        "Defenders train users to check the actual domain \u2014 not just the display name.",
      ],
      history: {
        label: "Domain impersonation in BEC (Rimasauskas et al.)",
        detail:
          "The U.S. indictment in the Google/Facebook fraud case alleged spoofed email addresses and invoices that appeared to originate from a legitimate Asian hardware manufacturer. The harm came from trust in plausible routing and paperwork \u2014 exactly what a slightly-wrong domain buys an attacker.",
      },
    },
  },
  {
    label: "it-notifications@orion.internal",
    feedback: {
      verdict: "strong",
      lines: [
        "Matches an internal-only Orion namespace. Real attackers can still spoof display names, but starting from a plausible internal From: is what a legitimate broadcast looks like.",
        "Always pair this with SPF/DKIM/DMARC awareness in real life \u2014 users see From:, mail admins see alignment.",
      ],
      history: {
        label: "Why internal mail is still spoofable",
        detail:
          "Even with internal domains, attackers use compromised accounts or misconfigured relays. The July 2020 Twitter incident involved phone- and employee-targeted social engineering that led to abuse of internal tools; U.S. federal complaints and company disclosures (2020) document the arrests and methods. Lesson: process and out-of-band verification matter \u2014 not one header alone.",
      },
    },
  },
  {
    label: "orion.support.team@gmail.com",
    feedback: {
      verdict: "risky",
      lines: [
        "Consumer webmail for \u201cofficial\u201d IT is a red flag. Enterprises use managed domains; freemail is easy to register and abandon.",
        "Exception: tiny shops \u2014 but for a logistics corp, this is inconsistent.",
      ],
      history: {
        label: "Freemail in targeted scams",
        detail:
          "Security awareness training (CISA, SANS, many national CSIRTs) repeatedly flags Gmail/Yahoo/Hotmail senders pretending to be payroll or IT. Historical cases mix nation-state phish (e.g. DNC-style credential harvest in 2016 used lookalike domains and consumer services in some waves) with pure crime \u2014 the common thread is domain mismatch.",
      },
    },
  },
];

/** @type {PhishOption[]} */
export const PHISHING_SUBJECTS = [
  {
    label: "URGENT: Your account will be suspended \u2014 verify within 24 hours",
    feedback: {
      verdict: "risky",
      lines: [
        "High-pressure deadlines and fake account lockouts are classic phishing pretexts. They short-circuit careful reading.",
        "Real IT notices usually reference a ticket, a change window, or a channel you already use \u2014 not a blind countdown to panic-click.",
      ],
      history: {
        label: "Spear phishing & political campaigns (2016)",
        detail:
          "In March 2016, John Podesta (chair of Hillary Clinton\u2019s presidential campaign) was targeted with a spear-phishing email spoofing a Google security alert. Staff interaction with that message is widely reported as part of the chain that led to mailbox compromise \u2014 a case study in how urgency plus a trusted brand name drives clicks.",
      },
    },
  },
  {
    label: "IT: SSO certificate rotation \u2014 no action unless you see errors (ticket CM-4491)",
    feedback: {
      verdict: "strong",
      lines: [
        "Specific, boring, and tied to a ticket id: closer to real enterprise comms. It lowers urgency so people read instead of panic.",
        "Phishers often do the opposite \u2014 vague subjects plus alarm words \u2014 because fear beats detail.",
      ],
      history: {
        label: "BEC and vendor impersonation (2013\u20132017)",
        detail:
          "Business Email Compromise often wins on plausible routine mail, not loud sirens. U.S. federal prosecutors charged Lithuanian national Evaldas Rimasauskas with orchestrating a scheme (approximately 2013\u20132015) that used forged invoices and spoofed email appearing to come from a real hardware vendor (Quanta Computer) to trick Google and Facebook into wiring over $100 million to fraudulent accounts. He pleaded guilty in 2019 (U.S. v. Rimasauskas, SDNY). Lesson: authenticity of process and domain matters more than subject-line drama.",
      },
    },
  },
  {
    label: "Congratulations \u2014 you\u2019ve been selected for a $50 gift card survey",
    feedback: {
      verdict: "weak",
      lines: [
        "Incentives and prizes are common mass-phishing bait. Corporate IT almost never routes \u201cfree money\u201d through random surveys.",
        "Spear phishers can dress this up with targeting, but the pattern still screams social engineering.",
      ],
      history: {
        label: "Gift-card scams & BEC (2010s\u2013present)",
        detail:
          "The FBI\u2019s Internet Crime Complaint Center (IC3) has long warned about business-email messages pushing wire transfers or gift-card purchases under time pressure. While not one single dated \u201cfamous hack,\u201d the pattern is one of the most reported real-world losses year after year \u2014 attackers prey on speed and hierarchy, not technical genius.",
      },
    },
  },
];

/**
 * 3 body options per subject (indexed by subject position).
 * Each set of 3 bodies is thematically linked to its subject.
 * @type {PhishOption[][]}
 */
export const PHISHING_BODIES_BY_SUBJECT = [
  // Subject 0: "URGENT: account suspended" (risky)
  [
    {
      label: "Your session expired. Verify here: http://bit.ly/7xk9q2 \u2014 ignore if already done.",
      feedback: {
        verdict: "risky",
        lines: [
          "URL shorteners hide the real host \u2014 standard in phishing because users cannot see the destination.",
          "Legit IT almost never asks you to \u201cverify\u201d identity through an opaque short link.",
        ],
        history: {
          label: "Short links in credential theft",
          detail:
            "Credential-phishing campaigns have abused bit.ly and similar services for years to mask malicious landing pages. The 2016 Podesta-related phishing (Google-themed) used a shortened link on at least one variant reported in open-source analysis \u2014 attackers need obfuscation, not sophistication.",
        },
      },
    },
    {
      label: "Your account is under review. If you did not request a change, no action is needed. Contact the service desk at x4200 with questions. Ref: SEC-AUDIT-8812.",
      feedback: {
        verdict: "strong",
        lines: [
          "Calm tone, ticket reference, and a real phone extension \u2014 this body contradicts the panicky subject, which actually helps a defender spot the mismatch.",
          "A skilled attacker would align urgency end-to-end; here the body reads like genuine IT \u2014 safe and verifiable.",
        ],
        history: {
          label: "Mismatched tone as a detection signal",
          detail:
            "Security awareness programs teach employees to look for contradictions between subject and body. When the subject screams \u201cURGENT\u201d but the body is calm and procedural, the combination signals either a sloppy phisher or a legitimate non-critical notice. Either way, the safe move is to verify out-of-band.",
        },
      },
    },
    {
      label: "Dear User, Please reply with your corporate password to confirm you received this bulletin.",
      feedback: {
        verdict: "risky",
        lines: [
          "No real security team asks for a password by email \u2014 ever. \u201cDear User\u201d is a generic salutation bot pattern.",
          "This is useful as a teaching example because it violates policy in one sentence.",
        ],
        history: {
          label: "Password solicitation (persistent scam pattern)",
          detail:
            "From early Nigerian advance-fee letters to modern \u201chelp desk\u201d spam, asking for passwords in cleartext email is an old tell. Regulators and standards bodies (NIST, ISO 27001 family) treat passwords as secrets never to be transmitted by email \u2014 attackers keep trying because it still works against untrained users.",
        },
      },
    },
  ],

  // Subject 1: "IT: SSO cert rotation, ticket CM-4491" (strong)
  [
    {
      label: "Do not use links in this email. Open SSO from your bookmark or the company portal. Problems? Call IT x4200 or open ticket CM-4491.",
      feedback: {
        verdict: "strong",
        lines: [
          "Tells the user how to behave safely (no link reliance) and gives a verifiable path \u2014 phone extension and ticket id.",
          "Phishing emails usually do the opposite: one big button to credential theft.",
        ],
        history: {
          label: "RSA SecurID breach (2011)",
          detail:
            "In March 2011, RSA (then part of EMC) disclosed that sophisticated attackers sent phishing emails with a malicious Excel attachment (\u201c2011 Recruitment plan.xls\u201d) to a small group of employees. One person opened it; the chain led to material related to SecurID. The lesson for users: unexpected attachments + plausible narrative = still verify through out-of-band channels \u2014 same spirit as \u201cdon\u2019t trust this mail\u2019s links.\u201d",
        },
      },
    },
    {
      label:
        "Hi,\n\nThis is a scheduled identity platform maintenance bulletin for Orion Logistics SSO trust-chain rotation. Most users will not need to take action if their workstation has synced policy updates, but a subset of accounts may briefly see a certificate mismatch warning at sign-in during the rollout window.\n\nTo reduce service desk load, please complete the self-check workflow before end of day:\nhttps://sso-orion.renewal-portal.net/cert/verify\n\nIf your portal session is already healthy, the check should return immediately with no further changes. Do not reply to this distribution list; audit logs are reviewed centrally.\n\nRegards,\nInfoSec Team\nOrion Logistics\nIdentity & Access Operations",
      feedback: {
        verdict: "risky",
        lines: [
          "The body looks plausible at first but pushes a link to an external domain (renewal-portal.net \u2014 not orion.internal). That\u2019s a textbook credential-harvesting setup.",
          "A real cert rotation notice would tell you to use your bookmarked portal, not click an email link.",
        ],
        history: {
          label: "Lookalike domains in enterprise phish",
          detail:
            "Attackers routinely register domains that resemble internal services (e.g. portal-orion.net vs. orion.internal). CISA and Microsoft Threat Intelligence have documented campaigns where the only difference is a subtle domain swap \u2014 employees click because the page looks right.",
        },
      },
    },
    {
      label: "Hi team, forward this email to three colleagues so IT can verify distribution. Include your employee ID in the reply.",
      feedback: {
        verdict: "weak",
        lines: [
          "Chain-letter mechanics (\u201cforward to three people\u201d) have no place in legitimate IT processes. Asking for an employee ID in a reply is a data-harvest pattern.",
          "Real certificate rotations are automated \u2014 IT does not need your help distributing notices.",
        ],
        history: {
          label: "Social proof exploitation",
          detail:
            "Some phishing campaigns use the \u201cforward this\u201d trick to weaponize trust networks: if a colleague sends it, it must be real. Combined with an ID request, the attacker harvests credentials through social chain reactions.",
        },
      },
    },
  ],

  // Subject 2: "Gift card survey" (weak)
  [
    {
      label: "Claim your $50 Amazon gift card by completing a 2-minute survey: http://gift-surv.co/orion50 \u2014 limited availability.",
      feedback: {
        verdict: "risky",
        lines: [
          "External short-domain, urgency (\u201climited availability\u201d), and monetary bait \u2014 this ticks every box for mass phishing.",
          "Corporate gift programs go through HR or payroll, not anonymous survey links.",
        ],
        history: {
          label: "Survey-phish campaigns",
          detail:
            "The Anti-Phishing Working Group (APWG) has tracked survey-as-bait campaigns for over a decade. They spike around holidays and year-end bonuses, exploiting the expectation that companies hand out perks. The link collects credentials or installs malware \u2014 no gift card ever arrives.",
        },
      },
    },
    {
      label: "This is an automated notice. Orion does not run gift card promotions by email. If you believe this message is legitimate, contact HR at hr@orion.internal before clicking anything.",
      feedback: {
        verdict: "strong",
        lines: [
          "Explicitly warns the user that this kind of promotion is not real, and gives a safe out-of-band verification path (HR email).",
          "Ironically, putting this body under a phishy subject makes the overall mail confusing \u2014 but the body itself teaches the right behavior.",
        ],
        history: {
          label: "Anti-phish awareness in email footers",
          detail:
            "Some organizations append \u201cOrion never asks for passwords by email\u201d to all outbound mail. This body follows that pattern \u2014 educating the reader instead of exploiting them.",
        },
      },
    },
    {
      label: "Congratulations! Enter your credit card number below for gift card shipping. Offer expires in 1 hour.",
      feedback: {
        verdict: "risky",
        lines: [
          "Credit card request + countdown timer = textbook scam. No enterprise promotion asks for payment info by email.",
          "The one-hour expiry is pure pressure \u2014 designed to prevent the victim from thinking or verifying.",
        ],
        history: {
          label: "Credit card harvesting via fake promotions",
          detail:
            "The FTC has filed numerous complaints against operations that used \u201cfree gift card\u201d lures to harvest credit card numbers. The \u201cshipping fee\u201d or \u201cverification\u201d pretext is a persistent social engineering pattern online.",
        },
      },
    },
  ],
];

/** Label column width for Subject:/From:/Body: alignment in the terminal. */
export const PHISHING_HEADER_LABEL_WIDTH = 10;

/**
 * Mission-1 compose answer key (single valid lure path).
 * Indices are 0-based.
 */
export const PHISHING_COMPOSE_ANSWER = {
  subjectIdx: 1, // "IT: SSO certificate rotation ..."
  bodyIdxBySubject: {
    1: 1, // external renewal-link body for subject 2
  },
  fromIdx: 0, // lookalike sender domain
};

const VERDICT_SCORE = { strong: 2, weak: 1, risky: 0 };

/**
 * Score the 3 independent picks.
 * @param {number} fromIdx  0-based index into PHISHING_FROM
 * @param {number} subjectIdx  0-based index into PHISHING_SUBJECTS
 * @param {number} bodyIdx  0-based index into PHISHING_BODIES_BY_SUBJECT[subjectIdx]
 */
export function scorePhishingPicks(fromIdx, subjectIdx, bodyIdx) {
  const from = PHISHING_FROM[fromIdx];
  const subject = PHISHING_SUBJECTS[subjectIdx];
  const body = PHISHING_BODIES_BY_SUBJECT[subjectIdx]?.[bodyIdx];
  const fs = VERDICT_SCORE[from?.feedback?.verdict] ?? 0;
  const ss = VERDICT_SCORE[subject?.feedback?.verdict] ?? 0;
  const bs = VERDICT_SCORE[body?.feedback?.verdict] ?? 0;
  const total = fs + ss + bs;
  const max = 6;
  const perfect = total === max;
  return { total, max, perfect, fromScore: fs, subjectScore: ss, bodyScore: bs };
}

/** @deprecated Kept for backward compat; use scorePhishingPicks instead. */
export function scorePhishingPackage() {
  return { total: 0, max: 6, correct: false };
}
