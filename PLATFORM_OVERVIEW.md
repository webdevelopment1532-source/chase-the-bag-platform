# Chase the Bag P2P Crypto Exchange Platform

Chase the Bag is a peer-to-peer (P2P) crypto exchange platform designed to simplify and secure person-to-person crypto trading. The platform pairs users for trading, manages escrow for funds, and optimizes engagement through advanced analytics and automation.

---

## Core Features

- **P2P Trade Matching**: Automatically pairs users seeking compatible crypto trades, eliminating the hassle of manually finding trading partners.
- **Escrow-Based Fund Management**: User funds are held in escrow until both parties confirm the trade, ensuring security, trust, and fairness. Platform collects service fees before escrow release.
- **Premium Popup Engagement**: Animated, personalized popups with Discord OAuth integration. Session-aware and segment-specific (premium, frequent, new, guest). Dynamic CTA based on user login state.
- **Discord OAuth Integration**: Seamless login with Discord accounts. Personalized popups based on user state. OAuth flow fully tested and production-ready.
- **Analytics & Monitoring**: Tracks popup impressions, clicks, dismissals, and engagement metrics. Monitors API latency and popup failures in real-time. Alerts sent via Slack, Discord, or email.
- **A/B Testing & Automated Optimization**: Variants tested across all user segments. Automatic assignment of optimal popup variant based on engagement metrics. Fully automated reporting and optimization loop.
- **Deployment & CI/CD Automation**: GitHub Actions automatically runs tests and deploys to Vercel. Environment variables securely injected. Ensures stable, production-ready releases.
- **Dashboarding & Visualization**: Grafana dashboard configured to visualize engagement, API performance, and user segmentation. Ready for further customization and advanced analytics.

---

## Platform Benefits

- **Security**: Escrow guarantees safe trades.
- **Efficiency**: Fully automated pairing and trade facilitation.
- **User Engagement**: Personalized popups and dynamic A/B testing maximize conversions.
- **Insights**: Real-time analytics and automated dashboards enable data-driven decisions.
- **Scalability**: Serverless architecture and CI/CD workflows support growth with minimal manual intervention.

---

## Frontend Structure

```
src/
├── assets/             # Images, icons, fonts, etc.
├── components/         # Reusable UI components
│   ├── popups/         # Popups / modals
│   │   ├── Popup.tsx
│   │   └── index.ts
│   ├── buttons/        # Example: reusable buttons
│   └── index.ts        # Export all components
├── hooks/              # Custom hooks
│   ├── useAnalytics.ts
│   ├── useAuth.ts
│   └── index.ts
├── pages/              # Top-level pages
│   ├── HomePage.tsx
│   └── Dashboard.tsx
├── routes/             # Router config
│   └── index.tsx
├── services/           # API services
│   ├── authService.ts
│   └── apiService.ts
├── store/              # Global state (Zustand or Redux)
│   └── store.ts
├── types/              # TypeScript type definitions
│   └── index.ts
├── utils/              # Helper functions
│   └── index.ts
├── App.tsx             # Main app layout
├── main.tsx            # App entry point
└── index.css           # Global styles (Tailwind or custom)
```

---

## Architecture Diagram

```
┌─────────────────────────┐
│       User Frontend      │
│  (React / Next.js App)  │
└───────────┬────────────┘
            │
  ┌─────────┼─────────┐
  │         │         │
  ▼         ▼         ▼
┌─────┐ ┌────────┐ ┌─────────────┐
│Popup│ │Discord │ │Trade/Escrow │
│& A/B│ │OAuth   │ │Management   │
└──┬──┘ └──┬─────┘ └─────┬──────┘
   │       │              │
   │ Track │ Retrieve     │
   │events │ user info    │
   ▼       ▼              ▼
┌────────────┐ ┌───────────────┐ ┌──────────────┐
│ /api/track │ │ User Database │ │ Escrow Ledger│
│ -popup     │ │ & Segments   │ │ & Trade Data │
└─────┬──────┘ └───────────────┘ └─────┬───────┘
      │                                 │
      ▼                                 ▼
┌───────────────┐                ┌───────────────┐
│ Analytics &   │                │ Escrow Release │
│ Monitoring    │                │ & Fee Deduction│
└─────┬─────────┘                └───────────────┘
      │
      ▼
┌───────────────┐
│ A/B Test      │
│ Automation    │
│ (Report &     │
│ Auto-optimize)│
└─────┬─────────┘
      │
      ▼
┌───────────────┐
│ Update Optimal│
│ Popup Variant │
│ (popup-variant.json) │
└─────────────────────┘
      │
      ▼
  Back to Frontend → New Users see the best variant
```

---

For more details, see the main README.md or ask for specific implementation files.
