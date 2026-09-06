# SafeSathi — Wireframes (Text Form)

Low-fidelity text wireframes for every major screen, used to lock down
layout and navigation before Phase 3 UI implementation. Visual design
(dark theme, glassmorphism, Lottie animations, spacing/type scale) is
defined separately when screens are actually built, using the
`frontend-design` guidance at that time — these wireframes are about
**structure and content**, not visual styling.

## Mobile App

### 1. Splash Screen
```
┌───────────────────────────────┐
│                                │
│                                │
│        [ Shield Logo /         │
│          Lottie animation ]    │
│                                │
│           SafeSathi            │
│  Proactive Safety, Not Just    │
│      an SOS Button.            │
│                                │
│         ● ● ●  (loading)       │
└───────────────────────────────┘
```

### 2. Onboarding (3 swipeable slides)
```
┌───────────────────────────────┐
│  [ Illustration ]               │
│                                  │
│  "SafeSathi watches for danger  │
│   so you don't have to reach    │
│   for your phone."              │
│                                  │
│   ● ○ ○            [ Skip ]     │
│                    [ Next → ]   │
└───────────────────────────────┘
```
Slide 2: voice/motion detection. Slide 3: emergency contacts + live
location. Final slide's "Next" becomes "Get Started" → Register screen.

### 3. Register
```
┌───────────────────────────────┐
│  ← Back              SafeSathi │
│                                  │
│  Create your account            │
│  [ Full Name                 ]  │
│  [ Phone Number    +91 ▾     ]  │
│  [ Email (optional)          ]  │
│                                  │
│  [       Send OTP  →         ]  │
│                                  │
│  Already have an account? Login │
└───────────────────────────────┘
```

### 4. OTP Verification
```
┌───────────────────────────────┐
│  ← Back                         │
│  Enter the code sent to         │
│  +91 XXXXX XXXXX                │
│                                  │
│   [_] [_] [_] [_] [_] [_]       │
│                                  │
│  Resend code in 00:28           │
│  [       Verify  →           ]  │
└───────────────────────────────┘
```

### 5. Login
```
┌───────────────────────────────┐
│            SafeSathi            │
│                                  │
│  [ Phone Number    +91 ▾     ]  │
│  [       Send OTP  →         ]  │
│  ───────────  or  ───────────   │
│  [ Email                     ]  │
│  [ Password                  ]  │
│  [       Log In  →           ]  │
│  Forgot password?                │
│  New here? Create an account     │
└───────────────────────────────┘
```

### 6. Home Dashboard
```
┌───────────────────────────────┐
│  ☰   SafeSathi          🔔      │
│                                  │
│   ┌───────────────────────┐    │
│   │   SafeScore: 82/100    │    │
│   │   ● You're in a safe    │    │
│   │     area right now       │    │
│   └───────────────────────┘    │
│                                  │
│         ┌───────────┐           │
│         │           │           │
│         │    SOS    │           │
│         │  (hold)   │           │
│         └───────────┘           │
│                                  │
│  [🎙 Listening] [📍 Tracking]   │
│                                  │
│  Quick actions:                 │
│  [Safe Route] [Heatmap]         │
│  [Fake Call]  [I'm Safe]        │
│                                  │
│  🏠      🗺️      💬      👤     │
│  Home    Map    Chat  Profile   │
└───────────────────────────────┘
```

### 7. Profile
```
┌───────────────────────────────┐
│  ← Profile                      │
│    [ Avatar ]  Roni's Name      │
│                +91 XXXXXXXXXX   │
│                                  │
│  Personal Information      >    │
│  Medical Information       >    │
│  Emergency Contacts (3/5)  >    │
│  Safety Preferences        >    │
│  Language: English         >    │
│  Settings                  >    │
│  Log Out                        │
└───────────────────────────────┘
```

### 8. Emergency Contacts
```
┌───────────────────────────────┐
│  ← Emergency Contacts   3 / 5   │
│                                  │
│  ┌────────────────────────┐    │
│  │ 👤 Mother   ★ Primary    │    │
│  │ +91 XXXXXXXXXX       ⋮   │    │
│  └────────────────────────┘    │
│  ┌────────────────────────┐    │
│  │ 👤 Friend                │    │
│  │ +91 XXXXXXXXXX       ⋮   │    │
│  └────────────────────────┘    │
│                                  │
│  [    + Add Contact          ]  │
└───────────────────────────────┘
```

### 9. SOS Active Screen (full-screen, high-contrast)
```
┌───────────────────────────────┐
│        🔴 SOS ACTIVE            │
│                                  │
│   Your emergency contacts       │
│   have been notified.           │
│                                  │
│   [   Live map, your pin    ]   │
│   [   moving in real time    ]  │
│                                  │
│   Recording evidence...  ●REC   │
│                                  │
│  [      I'm Safe Now →       ]  │
│  [      False Alarm          ]  │
└───────────────────────────────┘
```

### 10. Live Location Sharing (viewed by a contact, via web link or app)
```
┌───────────────────────────────┐
│  Roni is sharing live location  │
│  Last updated: 3 seconds ago    │
│                                  │
│   [        Live Map          ]  │
│   [     ● Roni (moving)      ]  │
│                                  │
│  Battery: 64%   Speed: 4 km/h   │
│  [   Call Roni  ] [ Call Police]│
└───────────────────────────────┘
```

### 11. Safe Route
```
┌───────────────────────────────┐
│  ← Safe Route                   │
│  From: [ Current Location    ]  │
│  To:   [ Search destination  ]  │
│                                  │
│  [        Find Safe Route     ] │
│                                  │
│  ┌────────────────────────┐    │
│  │  Route A · SafeScore 88  │    │
│  │  12 min · well-lit        │    │
│  ├────────────────────────┤    │
│  │  Route B · SafeScore 61  │    │
│  │  9 min · crosses 1 zone   │    │
│  └────────────────────────┘    │
│  [        Start Navigation    ] │
└───────────────────────────────┘
```

### 12. Risk Zone Heatmap
```
┌───────────────────────────────┐
│  ← Risk Heatmap          ⓘ      │
│                                  │
│   [        Map view           ] │
│   [   🟩🟩🟨🟥🟩 zones overlaid ]│
│                                  │
│  Legend: 🟩 Safe 🟨 Caution 🟥 High │
│  Tap a zone for details          │
│                                  │
│  Nearby: 2 reports in last 24h  │
└───────────────────────────────┘
```

### 13. Report Incident
```
┌───────────────────────────────┐
│  ← Report an Incident            │
│  Type: [ Harassment      ▾ ]     │
│  [        Add Photo(s)       ]   │
│  [ Description...             ]  │
│  [ 📍 Use current location ]     │
│  ( ) Report with my name         │
│  (•) Report anonymously          │
│  [         Submit Report      ]  │
└───────────────────────────────┘
```

### 14. Community Alerts
```
┌───────────────────────────────┐
│  ← Community Alerts             │
│  Within 800m of you             │
│                                  │
│  ┌────────────────────────┐    │
│  │ ⚠ Harassment reported     │  │
│  │ 350m away · 12 min ago     │ │
│  └────────────────────────┘    │
│  ┌────────────────────────┐    │
│  │ ⚠ SOS activated nearby     │ │
│  │ 600m away · 2 min ago      │ │
│  └────────────────────────┘    │
└───────────────────────────────┘
```

### 15. AI Chatbot
```
┌───────────────────────────────┐
│  ← SafeSathi Assistant           │
│                                  │
│  🤖 I can help with women's      │
│     rights info, legal steps,   │
│     emergency numbers, and      │
│     self-defense basics.        │
│                                  │
│  🧑 What's the women's helpline  │
│     number?                     │
│  🤖 National Women Helpline:     │
│     181 (24x7, toll-free)...    │
│                                  │
│  [ Type a message...    ] [Send]│
└───────────────────────────────┘
```

### 16. Fake Call Setup / Trigger
```
┌───────────────────────────────┐
│  ← Fake Call                    │
│  Caller name: [ Mom          ]  │
│  Caller voice: [ Record ▾    ]  │
│  Ring delay: [ 10s | 30s | 1m ] │
│                                  │
│  [    Trigger Fake Call Now  ]  │
│  (also available from lock       │
│   screen quick-action)           │
└───────────────────────────────┘
```

### 17. Settings
```
┌───────────────────────────────┐
│  ← Settings                     │
│  Voice Detection        ⬤────○  │
│  Motion Detection        ⬤────○ │
│  Tone Detection           ⬤────○│
│  Auto-SOS                  ⬤───○│
│  Silent Evidence Capture     ⬤─○│
│  Language                English>│
│  Notification Preferences      > │
│  Privacy & Data                 >│
│  About SafeSathi                >│
└───────────────────────────────┘
```

## Admin Dashboard (Web)

### 18. Admin Login
```
┌─────────────────────────────────────────┐
│                 SafeSathi Admin            │
│         ┌─────────────────────┐           │
│         │ Email                │           │
│         │ Password             │           │
│         │   [   Log In   ]     │           │
│         └─────────────────────┘           │
└─────────────────────────────────────────┘
```

### 19. Admin Overview / Analytics
```
┌─────────────────────────────────────────┐
│ Sidebar │  Overview                        │
│ Overview│  ┌────────┐┌────────┐┌────────┐ │
│ Users   │  │SOS Today││Active  ││Pending │ │
│ Reports │  │  14     ││Users   ││Reports │ │
│ Live SOS│  │         ││ 1,204  ││  27    │ │
│ Heatmap │  └────────┘└────────┘└────────┘ │
│ Export  │  [ SOS per day — line chart   ]  │
│         │  [ Peak timings — bar chart   ]  │
│         │  [ Risk zone summary — map    ]  │
└─────────────────────────────────────────┘
```

### 20. Admin — Reports Queue
```
┌─────────────────────────────────────────┐
│ Reports          Filter: [ Pending ▾ ]    │
│ ┌───┬──────────┬──────────┬───────────┐  │
│ │ID │ Type     │ Location │ Actions   │  │
│ ├───┼──────────┼──────────┼───────────┤  │
│ │101│Harassment│ Zone C-4 │ ✓ Verify   │  │
│ │   │          │          │ ✕ Reject   │  │
│ ├───┼──────────┼──────────┼───────────┤  │
│ │102│Stalking  │ Zone B-2 │ ✓ Verify   │  │
│ └───┴──────────┴──────────┴───────────┘  │
└─────────────────────────────────────────┘
```

### 21. Admin — Live SOS Monitor
```
┌─────────────────────────────────────────┐
│ Live SOS Events                    🔴 3 Active │
│ ┌────────────────────┐  ┌────────────┐  │
│ │ Live map, all active│  │ User: R.S.  │  │
│ │ SOS pins            │  │ Started: 2m │  │
│ │                      │  │ Battery: 41%│  │
│ └────────────────────┘  │ [View Detail]│  │
│                          └────────────┘  │
└─────────────────────────────────────────┘
```

### 22. Admin — Users
```
┌─────────────────────────────────────────┐
│ Users        Search: [___________] 🔍     │
│ ┌───┬────────┬───────────┬────┬────────┐│
│ │ID │ Name   │ Phone     │SOS │ Status  ││
│ ├───┼────────┼───────────┼────┼────────┤│
│ │...│ Roni S.│ +91XXXXXXX│ 2  │ Active  ││
│ └───┴────────┴───────────┴────┴────────┘│
└─────────────────────────────────────────┘
```

### 23. Admin — Heatmap Management
```
┌─────────────────────────────────────────┐
│ Heatmap Zones      [ Recalculate All ]    │
│ [           Full-screen map view       ]  │
│ Zone B-2: 🟥 Risk 78 · 14 reports · recalc │
│ Zone C-4: 🟨 Risk 45 · 6 reports  · recalc │
└─────────────────────────────────────────┘
```

### 24. Admin — Export
```
┌─────────────────────────────────────────┐
│ Export Data                               │
│ Type: [ Users | Reports | SOS Logs ]      │
│ Range: [ Jan 2026 ▾ ] to [ Feb 2026 ▾ ]   │
│ [        Download CSV               ]     │
│ [        Generate Monthly Report    ]     │
└─────────────────────────────────────────┘
```
