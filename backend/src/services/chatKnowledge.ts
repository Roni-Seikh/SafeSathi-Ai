import { ChatIntent } from '../models/ChatHistory.model';

export type ChatAction =
  | { type: 'sos' }
  | { type: 'call'; number: string; label: string }
  | { type: 'fake_call' }
  | { type: 'safe_haven' }
  | { type: 'journey' }
  | { type: 'share_location' }
  | { type: 'link'; url: string; label: string };

export interface KnowledgeEntry {
  id: string;
  intent: ChatIntent;
  title: string;
  /** Lower-case phrases. Multi-word phrases score higher than single words. */
  keywords: string[];
  answer: string;
  followUps?: string[];
  actions?: ChatAction[];
}

/** Built-in, offline women-safety knowledge base for India. Legal text refers to the
 * Bharatiya Nyaya Sanhita (BNS) 2023 and Bharatiya Nagarik Suraksha Sanhita (BNSS) 2023,
 * which replaced the IPC and CrPC on 1 July 2024. General information, not legal advice. */
export const KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'helplines',
    intent: 'emergency_numbers',
    title: 'Emergency helplines (India)',
    keywords: ['helpline', 'what number', 'number to call', 'number do i call', 'numbers', 'emergency number', 'phone number', 'which number', 'call whom', 'who to call', 'police number', 'ambulance', '112', '1091', '181', 'toll free', 'ncw', 'hotline'],
    answer:
      '**Emergency numbers (India)**\n• **112** — single emergency number (police, fire, ambulance). Works from any phone.\n• **1091** — Women Helpline (police)\n• **181** — Women Helpline (counselling, domestic violence, shelter)\n• **100** — Police · **108** — Ambulance (most states)\n• **1930** — National Cyber Crime Helpline\n• **1098** — Childline\n• **15100** — Free legal aid (NALSA)\n• **14416** — Tele-MANAS mental-health support\n• NCW helpline: 7827170170 (verify on ncw.gov.in)\nNumbers can differ slightly by state; **112 always works**.',
    followUps: ['What is a Zero FIR?', 'I am being followed', 'Free legal help'],
    actions: [{ type: 'call', number: '112', label: 'Call 112' }, { type: 'call', number: '1091', label: 'Women Helpline 1091' }],
  },
  {
    id: 'emergency_now',
    intent: 'emergency_numbers',
    title: 'Immediate danger',
    keywords: ['help me', 'attack', 'attacked', 'unsafe now', 'in danger', 'being chased', 'kidnap', 'molest', 'grabbed', 'assault me', 'threatening me', 'rape', 'forced me', 'emergency'],
    answer:
      '**If you are in danger right now:**\n1. Press **SOS** in SafeSathi (or call **112**) — do this first.\n2. Move toward people, light, a shop or a vehicle with other passengers.\n3. Make noise: shout "**Fire!**" or "**Bachao!**" — people respond faster to "fire".\n4. Don\'t argue or negotiate — create distance and get away.\nSOS starts recording evidence and shares your live location with your contacts.',
    actions: [{ type: 'sos' }, { type: 'call', number: '112', label: 'Call 112' }, { type: 'safe_haven' }, { type: 'fake_call' }],
  },
  {
    id: 'being_followed',
    intent: 'self_defense',
    title: 'Being followed',
    keywords: ['followed', 'following me', 'someone is following', 'stalker', 'tailing', 'behind me', 'peecha', 'पीछा', 'being watched', 'creepy man'],
    answer:
      '**If you think you are being followed:**\n• Don\'t go home — an attacker would learn where you live.\n• Cross the street and change direction; if the person follows, it is not a coincidence.\n• Head to a **crowded, lit place**: shop, petrol pump, police booth, hospital, hotel lobby.\n• Phone someone **out loud** ("I\'m at the corner of … see you in two minutes").\n• Tap **Safe Haven** in SafeSathi to find the nearest police station / hospital open now.\n• If you feel threatened, press SOS or call 112.',
    followUps: ['Find nearest police station', 'Fake call', 'What is stalking under law?'],
    actions: [{ type: 'safe_haven' }, { type: 'fake_call' }, { type: 'share_location' }, { type: 'sos' }],
  },
  {
    id: 'stalking_law',
    intent: 'legal_help',
    title: 'Stalking — the law',
    keywords: ['stalking', 'stalked', 'keeps calling', 'keeps messaging', 'harass online', 'stalking law', 'section 78', 'bns 78', '354d'],
    answer:
      '**Stalking — Section 78, Bharatiya Nyaya Sanhita (earlier IPC 354D)**\nFollowing a woman, or repeatedly contacting her (in person, by phone, message or online) after she has made it clear she is not interested, is an offence. Monitoring her internet/e-mail use is also covered.\n**What to do:** save screenshots/call logs with dates, tell a trusted person, and file a complaint (or Zero FIR / e-FIR). Online stalking can also be reported at **cybercrime.gov.in**.',
    followUps: ['What is a Zero FIR?', 'How do I report cyber harassment?'],
    actions: [{ type: 'link', url: 'https://cybercrime.gov.in', label: 'cybercrime.gov.in' }],
  },
  {
    id: 'zero_fir',
    intent: 'legal_help',
    title: 'Zero FIR / e-FIR',
    keywords: ['zero fir', 'fir', 'file complaint', 'file a complaint', 'lodge fir', 'police complaint', 'e-fir', 'efir', 'register complaint', 'complaint', 'report to police', 'bnss 173', 'section 173', 'शिकायत'],
    answer:
      '**Filing an FIR**\n• You can file a **Zero FIR at ANY police station**, regardless of where the incident happened; it is then transferred (Section 173, BNSS).\n• Information can also be given **electronically (e-FIR)** — you then sign it within 3 days.\n• For offences like assault on a woman or outraging modesty, the information should be **recorded by a woman police officer**, and you can ask to give your statement where you feel comfortable.\n• You are entitled to a **free copy** of the FIR.\n• Take: your ID, any evidence (SafeSathi **Evidence Summary**, screenshots, audio, photos), names/vehicle numbers.',
    followUps: ['Police refuse to file my FIR', 'Free legal aid'],
  },
  {
    id: 'fir_refused',
    intent: 'legal_help',
    title: 'Police refuse to register FIR',
    keywords: ['refuse fir', 'refused to file', 'not registering', 'police not listening', 'police refuse', 'won\'t file', 'not taking my complaint', 'police ignoring', 'denied fir'],
    answer:
      '**If the police refuse to register your complaint**\n1. Ask politely for the refusal **in writing** and note the officer\'s name/number.\n2. Send your complaint **in writing (post / e-mail) to the Superintendent / DCP** of the district.\n3. You can approach the **Magistrate**, who can direct the police to register the FIR.\n4. Complain to the **State Women Commission** or **NCW**, and use the state police portal / **112**.\n5. Call **181** or **15100** (NALSA) for free help with the process.\nKeep a copy of everything you send.',
    actions: [{ type: 'call', number: '15100', label: 'NALSA free legal aid 15100' }, { type: 'call', number: '181', label: 'Women Helpline 181' }],
  },
  {
    id: 'sections_overview',
    intent: 'women_rights',
    title: 'Key BNS sections protecting women',
    keywords: ['section', 'bns', 'ipc', 'law for women', 'which law', 'women rights', 'my rights', 'legal rights', 'harassment law', 'touching me', 'touched me', 'groping', 'eve teasing', 'eve-teasing', 'catcalling', 'modesty', 'molestation', 'law'],
    answer:
      '**Key sections of the Bharatiya Nyaya Sanhita (2023)**\n• **74** — assault/criminal force on a woman to outrage her modesty (earlier IPC 354)\n• **75** — sexual harassment (unwelcome touch, sexual remarks, showing pornography, demands for sexual favours)\n• **76** — assault with intent to disrobe\n• **77** — voyeurism (watching/recording a woman in a private act)\n• **78** — stalking\n• **79** — word, gesture or act insulting a woman\'s modesty (catcalling, lewd sounds)\n• **85–86** — cruelty by husband or relatives\n• **124** — acid attack\nThese are general pointers; a lawyer or legal-aid clinic (**15100**) can tell you how they apply to your case.',
    followUps: ['What is sexual harassment at work?', 'Domestic violence help', 'What is a Zero FIR?'],
  },
  {
    id: 'posh',
    intent: 'women_rights',
    title: 'Sexual harassment at work (POSH)',
    keywords: ['workplace', 'office harassment', 'boss', 'colleague', 'posh', 'internal committee', 'icc', 'work harassment', 'sexual harassment at work', 'manager touching', 'harassment at work', 'harassed at work'],
    answer:
      '**Workplace harassment — POSH Act, 2013**\n• Every employer with 10+ employees must have an **Internal Committee (IC)**; otherwise the **Local Committee** at the district handles it.\n• Complain **in writing within 3 months** of the incident (the committee can extend this by up to 3 more months for good reason).\n• You can ask for **interim relief** (e.g. transfer, leave) during the inquiry; the complaint is **confidential**.\n• You may *also* file a criminal complaint (BNS 75 etc.) — the two routes are independent.\nKeep emails, chats, dates and names of witnesses.',
  },
  {
    id: 'domestic_violence',
    intent: 'women_rights',
    title: 'Domestic violence',
    keywords: ['domestic violence', 'husband beats', 'husband hits', 'in-laws', 'dowry', 'abusive husband', 'abuse at home', 'wife beating', 'marital abuse', '498a', 'cruelty', 'dv act', 'ghar', 'domestic abuse', 'beaten by'],
    answer:
      '**Domestic violence — you have options**\n• Call **181** (Women Helpline) or **112** if you are in immediate danger.\n• The **Protection of Women from Domestic Violence Act, 2005** lets you seek a **protection order**, **residence order** (you can\'t be thrown out of the shared home) and **monetary relief** through a Magistrate; a **Protection Officer** helps you file.\n• Cruelty by husband/relatives is a criminal offence (**BNS 85–86**, earlier IPC 498A).\n• **One Stop Centres (Sakhi)** offer shelter, medical, police and legal help under one roof.\n• Free legal aid: **15100**.\nIf it is safe, keep photos of injuries, medical reports and messages.',
    actions: [{ type: 'call', number: '181', label: 'Women Helpline 181' }, { type: 'call', number: '112', label: 'Call 112' }],
  },
  {
    id: 'legal_aid',
    intent: 'legal_help',
    title: 'Free legal aid',
    keywords: ['free lawyer', 'legal aid', 'free legal', 'cannot afford lawyer', 'nalsa', 'lawyer', 'advocate', '15100', 'legal help', 'legal advice'],
    answer:
      '**Free legal aid**\nWomen are entitled to **free legal services** through the Legal Services Authorities (NALSA / State / District). Call **15100** or visit your **District Legal Services Authority (DLSA)** — a lawyer is provided at no cost, including for police-station and court stages.',
    actions: [{ type: 'call', number: '15100', label: 'Call 15100' }],
  },
  {
    id: 'rights_when_questioned',
    intent: 'women_rights',
    title: 'Your rights with the police',
    keywords: ['arrest', 'police station', 'questioned', 'summon', 'night arrest', 'police custody', 'woman officer', 'my rights police', 'police at night', 'detain'],
    answer:
      '**Your rights with the police**\n• A woman is **generally not arrested after sunset or before sunrise** without a woman officer obtaining a Magistrate\'s prior permission, except in exceptional cases.\n• Women should be **arrested/searched by women officers**.\n• A woman can generally be **questioned at her residence** rather than at the police station.\n• Your **identity as a survivor of a sexual offence must not be disclosed**.\n• You have the right to a **free copy of the FIR** and to inform a relative or friend.\nIf any of these are ignored, say so politely, note names/badge numbers and contact **15100** or a lawyer.',
  },
  {
    id: 'after_assault',
    intent: 'women_rights',
    title: 'After a sexual assault',
    keywords: ['sexual assault', 'raped', 'after rape', 'medical exam', 'preserve evidence', 'assaulted me', 'sexually assaulted', 'what to do after', 'abused me'],
    answer:
      '**If you have been sexually assaulted — you are not at fault.**\n1. Get to a safe place; call **112** or a person you trust.\n2. **Try not to wash, change or clean up** before a medical examination if you can — it helps preserve evidence. If you already have, you can still report.\n3. Go to a hospital: **treatment and first aid must be provided free** at government and private hospitals.\n4. You can file a **Zero FIR** at any police station; a **woman officer** records your statement.\n5. Support: **181**, **1091**, **15100**, and **Tele-MANAS 14416** for emotional support.\nYour identity is protected by law.',
    actions: [{ type: 'call', number: '112', label: 'Call 112' }, { type: 'call', number: '181', label: 'Women Helpline 181' }, { type: 'call', number: '14416', label: 'Tele-MANAS 14416' }],
  },
  {
    id: 'cyber',
    intent: 'legal_help',
    title: 'Cyber harassment & image abuse',
    keywords: ['cyber', 'online harassment', 'morphed', 'fake profile', 'leaked photos', 'intimate images', 'revenge porn', 'blackmail', 'sextortion', 'instagram', 'whatsapp harass', 'trolling', 'deepfake', 'sextortion', 'threatening online', 'cyber crime'],
    answer:
      '**Online harassment, blackmail or leaked images**\n• **Don\'t pay or comply** with blackmail. Don\'t delete the chats — **screenshot** them with dates and the sender\'s profile link.\n• Report at **cybercrime.gov.in** or call **1930**; you can file as an anonymous complainant for some categories.\n• Report/block the account on the platform; for intimate images use **StopNCII.org** to help stop them spreading.\n• Voyeurism and sharing private images is an offence (**BNS 77**); you may also file an FIR at any police station.\nTell someone you trust — you are the victim, not the one at fault.',
    actions: [{ type: 'link', url: 'https://cybercrime.gov.in', label: 'Report at cybercrime.gov.in' }, { type: 'call', number: '1930', label: 'Call 1930' }],
  },
  {
    id: 'cab_safety',
    intent: 'self_defense',
    title: 'Cab / auto safety',
    keywords: ['cab', 'taxi', 'uber', 'ola', 'rapido', 'auto', 'rickshaw', 'ride', 'driver', 'night travel', 'travelling alone', 'travel alone', 'late night', 'route deviation', 'wrong route'],
    answer:
      '**Cab & auto safety**\n• Match the **number plate, driver photo and name** with the app before getting in.\n• **Share the live trip** with a contact — or start a **Guardian Journey** in SafeSathi with the vehicle number: if you don\'t arrive on time, your contacts are alerted automatically.\n• Sit where you can exit easily; keep your phone charged and **don\'t let the call end** if you feel uneasy.\n• If the route changes, ask why; if the answer is odd, **call 112** and ask to stop in a busy, lit place.\n• Avoid sharing your full address; get dropped at a lit point near home if you feel unsafe.',
    followUps: ['Start a safe journey', 'Fake call'],
    actions: [{ type: 'journey' }, { type: 'fake_call' }],
  },
  {
    id: 'self_defense_basics',
    intent: 'self_defense',
    title: 'Self-defence basics',
    keywords: ['self defense', 'self defence', 'defend myself', 'martial arts', 'how to fight', 'attacker grabs', 'grabs my wrist', 'wrist grab', 'strike', 'pepper spray', 'weapon', 'keys', 'palm strike', 'hair pulled', 'choke'],
    answer:
      '**Self-defence — the goal is to escape, not to win**\n• **Make noise first** — shout; it draws help and unsettles the attacker.\n• Strike soft targets: **eyes, nose, throat, groin, knees**. Palm-heel to the nose/chin, knee to the groin, stomp on the instep.\n• **Wrist grab:** rotate your arm toward the attacker\'s *thumb* (the weakest part of the grip) while stepping back and pulling free.\n• Anything can be a tool: keys between fingers, a bag swung hard, a pen, a water bottle.\n• Then **run to people** and call 112.\nA personal safety alarm is a legal, effective deterrent. A short local self-defence class (many police departments run free ones) builds real confidence.',
    actions: [{ type: 'call', number: '112', label: 'Call 112' }],
  },
  {
    id: 'public_transport',
    intent: 'self_defense',
    title: 'Trains, buses & metro',
    keywords: ['train', 'railway', 'bus', 'metro', 'local train', 'coach', 'ladies compartment', 'conductor', 'rpf', 'railway helpline', '139', '182', 'station harassment', 'groping'],
    answer:
      '**Public transport harassment**\n• **Train:** call **139** (Railway helpline) or **182** (Railway Protection Force); alert the TTE/guard; move to the ladies\' coach or a crowded one.\n• **Bus/metro:** shout so others notice, tell the conductor/driver or station staff, and note the vehicle number.\n• Photograph or record the person *only if it is safe* to do so.\n• You can file a Zero FIR later at any police station; Government Railway Police (GRP) handles train incidents.',
    actions: [{ type: 'call', number: '182', label: 'RPF 182' }, { type: 'call', number: '139', label: 'Railways 139' }],
  },
  {
    id: 'drink_spiking',
    intent: 'self_defense',
    title: 'Drink spiking',
    keywords: ['drink spiked', 'spiked', 'drugged', 'drink drugged', 'dizzy at party', 'someone put something', 'club', 'party safety', 'date rape'],
    answer:
      '**Drink spiking**\n• Never leave a drink unattended; accept drinks only from the bar/server.\n• Signs: sudden dizziness, confusion, nausea, feeling far more drunk than expected.\n• If you suspect it: tell a **trusted friend or venue staff immediately**, don\'t leave with strangers, and get to a hospital (tests work best within hours). Call **112**.\n• Agree on a **code word** with friends that means "get me out of here".',
    actions: [{ type: 'call', number: '112', label: 'Call 112' }, { type: 'fake_call' }],
  },
  {
    id: 'meeting_stranger',
    intent: 'self_defense',
    title: 'Meeting someone new',
    keywords: ['first date', 'dating app', 'tinder', 'bumble', 'meeting stranger', 'meeting online friend', 'blind date', 'meet someone'],
    answer:
      '**Meeting someone from the internet**\n• Meet in a **public, busy place**; arrive and leave on your own.\n• Tell a friend **where, when and who**; share live location (start a Guardian Journey).\n• Video-call first, search their name/photos, trust your instincts — it is always fine to leave.\n• Set a **check-in time** with a friend; SafeSathi can alert your contacts automatically if you miss it.',
    actions: [{ type: 'journey' }, { type: 'fake_call' }],
  },
  {
    id: 'safe_walk_home',
    intent: 'self_defense',
    title: 'Walking home safely',
    keywords: ['walking home', 'walk home', 'going home', 'dark street', 'night walk', 'lonely road', 'safe route', 'walking alone', 'isolated', 'parking', 'lift', 'elevator', 'atm'],
    answer:
      '**Walking home**\n• Stick to **well-lit, busy streets** even if longer; avoid shortcuts through empty lanes.\n• Keep **one ear free** (earphones off or one bud out) and phone ready — not buried in the bag.\n• Start a **Guardian Journey**: your contacts get your ETA and are alerted automatically if you don\'t arrive.\n• Have keys ready before you reach the door; in lifts, stand near the buttons and get out if you feel uneasy.\n• Know the nearest **Safe Haven** (police station, hospital, 24x7 shop) on your route.',
    actions: [{ type: 'journey' }, { type: 'safe_haven' }],
  },
  {
    id: 'child_safety',
    intent: 'women_rights',
    title: 'Child in danger',
    keywords: ['child abuse', 'child in danger', 'minor', 'pocso', 'childline', 'girl child', 'my daughter', 'my child is'],
    answer:
      '**Child in danger / abuse**\nCall **1098 (Childline)** or **112** immediately. Sexual offences against anyone under 18 fall under the **POCSO Act, 2012** — reporting is **mandatory** for those who know of it, and the child\'s identity is protected.',
    actions: [{ type: 'call', number: '1098', label: 'Childline 1098' }, { type: 'call', number: '112', label: 'Call 112' }],
  },
  {
    id: 'mental_support',
    intent: 'general',
    title: 'Feeling scared or anxious',
    keywords: ['scared', 'anxious', 'anxiety', 'panic', 'depressed', 'traumatised', 'traumatized', 'cant sleep', 'afraid', 'stress', 'feeling low', 'mental health', 'counselling', 'trauma', 'suicidal', 'want to die', 'self harm'],
    answer:
      'I\'m really sorry you\'re going through this — what you feel is valid, and you don\'t have to carry it alone.\n• **Tele-MANAS: 14416** (free, 24x7 mental-health support, many languages).\n• **181** can connect you with counselling and a One Stop Centre.\n• If you might hurt yourself or feel unsafe right now, call **112** immediately, and tell someone near you.\nTalking to a trusted person tonight — even a short message — helps.',
    actions: [{ type: 'call', number: '14416', label: 'Tele-MANAS 14416' }, { type: 'call', number: '112', label: 'Call 112' }],
  },
  {
    id: 'about_app',
    intent: 'general',
    title: 'How SafeSathi protects you',
    keywords: ['how does safesathi', 'what can you do', 'features', 'how to use', 'what is safesathi', 'about app', 'guardian', 'duress', 'evidence vault', 'voice trigger', 'help words', 'sathi', 'hello', 'hi', 'hey', 'namaste', 'who are you'],
    answer:
      '**Hi, I\'m Sathi — your safety companion.** Here is what SafeSathi does:\n• **Voice Guardian** — say *"help", "bachao", "save me"* and an SOS starts (works while the app is open and Guardian Mode is on).\n• **Evidence Vault** — after an SOS, audio is recorded in chunks and secured with a tamper-proof hash chain.\n• **Guardian Journey** — share your trip; if you don\'t arrive, your contacts are alerted, even if your phone dies.\n• **Duress PIN** — a secret PIN that *looks* like cancelling an SOS but keeps help coming.\n• **Safe Haven**, **Fake Call**, **Siren**, **Safe Routes** and live **SafeScore**.\nAsk me about your rights, how to file an FIR, self-defence, or just say what is happening.',
    followUps: ['What are my rights?', 'How do I file an FIR?', 'I am being followed'],
  },
];

export const FALLBACK_ANSWER =
  'I might not have a precise answer for that, but here is what I can always help with:\n• Your **rights and the law** (FIR, stalking, harassment, domestic violence)\n• **Self-defence and safe travel** tips\n• **Emergency numbers** — **112** works everywhere\n• If you are in danger right now, press **SOS** or call **112**.\nTry asking, for example: "How do I file a Zero FIR?" or "I am being followed".';
