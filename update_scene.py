import re

path = '/Users/kurtvonschaeffer/Downloads/video-creation-request/project/algolend-scene.jsx'
with open(path, 'r') as f:
    text = f.read()

# CHUNK 1
text = re.sub(r'const TOTAL = 223;', 'const TOTAL = 182;', text)

# CHUNK 2
text = re.sub(r'const fadeIn=easeOut3\(prog\(t,0\.2,0\.9\)\), fadeOut=easeIn3\(prog\(t,4\.5,0\.9\)\);\s*const alpha=t<5\.5\?fadeIn:fadeIn\*\(1-fadeOut\);',
    'const fadeIn=easeOut3(prog(t,0.2,0.7)), fadeOut=easeIn3(prog(t,3.8,0.7));\n  const alpha=t<4.5?fadeIn:fadeIn*(1-fadeOut);', text)

# CHUNK 3
text = re.sub(r'function SplitFullStack\(\)\{\s*const \{localTime:t\}=useSprite\(\);\s*const DUR=9;',
    'function SplitFullStack(){\n  const {localTime:t}=useSprite();\n  const DUR=8;', text)

# CHUNK 4
text = re.sub(r'const hubP=easeOut3\(prog\(t,0,1\.0\)\);\s*const fade=t<20\?1:1-easeIn3\(prog\(t,20,1\.0\)\);',
    'const hubP=easeOut3(prog(t,0,1.0));\n  const fade=t<14?1:1-easeIn3(prog(t,14,1.0));', text)

# CHUNK 5
text = re.sub(r'const titleP=easeOut3\(prog\(t,0\.4,1\.0\)\);\s*const fade=t<14\?1:1-easeIn3\(prog\(t,14,1\.0\)\);',
    'const titleP=easeOut3(prog(t,0.4,1.0));\n  const fade=t<13?1:1-easeIn3(prog(t,13,1.0));', text)

# CHUNK 7: AlgolendScene Sprites replacement
new_sprites = """
    /* INTRO  0–5s */
    React.createElement(Sprite,{start:0,end:5}, React.createElement(Intro)),

    /* ── ADMIN PORTAL ── */
    /* 01 Dashboard  5–17s */
    React.createElement(Sprite,{start:5,end:17},
      React.createElement(ScreenShot,{src:'uploads/02_admin_dashboard.png',fromScale:1.10,toScale:1.01,fromX:0,toX:-18,fromY:0,toY:-12,dur:12,fadeIn:0.5,fadeOut:0.55}),
      React.createElement(Vignette),React.createElement(TopFade),React.createElement(BottomFade),
      React.createElement(ScreenLabel,{icon:'📊',label:'Admin Dashboard'}),
      React.createElement(FeatureList,{features:['Revenue & Cash Flow Tracking','Portfolio Health Score','Application Pipeline Analytics','SureSystems Connected']}),
    ),
    React.createElement(Sprite,{start:5.5,end:9},
      React.createElement(ChapterCard,{num:'01',title:'Admin Dashboard',sub:'Analytics · Revenue tracking · Portfolio overview'})),

    /* 02 Applications  17–29s */
    React.createElement(Sprite,{start:17,end:29},
      React.createElement(ScreenShot,{src:'uploads/03_admin_applications.png',fromScale:1.08,toScale:1.01,fromX:12,toX:-12,fromY:0,toY:-8,dur:12,fadeIn:0.5,fadeOut:0.55}),
      React.createElement(Vignette),React.createElement(TopFade),React.createElement(BottomFade),
      React.createElement(ScreenLabel,{icon:'📋',label:'Loan Applications'}),
      React.createElement(FeatureList,{features:['Full Application Pipeline','Credit Check Automation','DebiCheck Integration','In-Branch Application Tool']}),
    ),
    React.createElement(Sprite,{start:17.5,end:21},
      React.createElement(ChapterCard,{num:'02',title:'Applications',sub:'Pipeline management · Credit checks · In-branch tools'})),

    /* 03 Users  29–41s */
    React.createElement(Sprite,{start:29,end:41},
      React.createElement(ScreenShot,{src:'uploads/06_admin_users.png',fromScale:1.08,toScale:1.01,fromX:-14,toX:14,fromY:0,toY:0,dur:12,fadeIn:0.5,fadeOut:0.55}),
      React.createElement(Vignette),React.createElement(TopFade),React.createElement(BottomFade),
      React.createElement(ScreenLabel,{icon:'👥',label:'Users & Clients'}),
      React.createElement(FeatureList,{features:['Clients · Staff · Admins','Multi-Branch Management','Compliance Tracking','Role-Based Access Control']}),
    ),
    React.createElement(Sprite,{start:29.5,end:33},
      React.createElement(ChapterCard,{num:'03',title:'Users & Compliance',sub:'Client management · Staff roles · Multi-branch support'})),

    /* 04 Payments  41–53s */
    React.createElement(Sprite,{start:41,end:53},
      React.createElement(ScreenShot,{src:'uploads/11_admin_outgoing_payments.png',fromScale:1.07,toScale:1.01,fromX:0,toX:0,fromY:-12,toY:12,dur:12,fadeIn:0.5,fadeOut:0.55}),
      React.createElement(Vignette),React.createElement(TopFade),React.createElement(BottomFade),
      React.createElement(ScreenLabel,{icon:'💳',label:'Finance · Payments'}),
      React.createElement(FeatureList,{features:['Outgoing Disbursement Queue','Paid History & Comparison','Transaction Search & Filter','Bulk Data Export']}),
    ),
    React.createElement(Sprite,{start:41.5,end:45},
      React.createElement(ChapterCard,{num:'04',title:'Finance & Payments',sub:'Disbursements · Transaction tracking · Payment history'})),

    /* 05 Settings  53–65s */
    React.createElement(Sprite,{start:53,end:65},
      React.createElement(ScreenShot,{src:'uploads/14_admin_settings.png',fromScale:1.07,toScale:1.01,fromX:12,toX:-12,fromY:0,toY:0,dur:12,fadeIn:0.5,fadeOut:0.55}),
      React.createElement(Vignette),React.createElement(TopFade),React.createElement(BottomFade),
      React.createElement(ScreenLabel,{icon:'⚙️',label:'Settings & Configuration'}),
      React.createElement(FeatureList,{features:['System Branding','User Management','Security & Access Controls','Billing & Subscription']}),
    ),
    React.createElement(Sprite,{start:53.5,end:57},
      React.createElement(ChapterCard,{num:'05',title:'Settings',sub:'Branding · Security · User management · Billing'})),

    /* ── CLIENT PORTAL ── */
    React.createElement(Sprite,{start:65,end:70},
      React.createElement(SectionSeparator,{label:'Client Portal',sub:'Dashboard · Apply · Transactions · Profile · Support',col:C.green,colL:C.greenL})),

    /* 06 Client Dashboard  70–82s */
    React.createElement(Sprite,{start:70,end:82},
      React.createElement(ScreenShot,{src:'uploads/16_client_dashboard.png',fromScale:1.10,toScale:1.01,fromX:0,toX:-16,fromY:0,toY:-10,dur:12,fadeIn:0.5,fadeOut:0.55}),
      React.createElement(Vignette),React.createElement(TopFade),React.createElement(BottomFade),
      React.createElement(ScreenLabel,{icon:'🏠',label:'Client Dashboard',accent:true}),
      React.createElement(FeatureList,{accent:true,features:['Portfolio Overview','Balance · Credit Score · Payments','Quick Actions: New Loan · Make Payment','Experian Financial Standing']}),
    ),
    React.createElement(Sprite,{start:70.5,end:74},
      React.createElement(ChapterCard,{num:'06',title:'Client Dashboard',sub:'Portfolio overview · Balance · Credit score · Quick actions',accent:C.green})),

    /* 07 Apply for Loan  82–94s */
    React.createElement(Sprite,{start:82,end:94},
      React.createElement(ScreenShot,{src:'uploads/17_client_apply_loan.png',fromScale:1.08,toScale:1.01,fromX:-12,toX:12,fromY:0,toY:-8,dur:12,fadeIn:0.5,fadeOut:0.55}),
      React.createElement(Vignette),React.createElement(TopFade),React.createElement(BottomFade),
      React.createElement(ScreenLabel,{icon:'📝',label:'Apply for Loan',accent:true}),
      React.createElement(FeatureList,{accent:true,features:['4-Step Guided Application','Consent & Privacy Management','Credit Check → Select Amount','Instant Confirmation']}),
    ),
    React.createElement(Sprite,{start:82.5,end:86},
      React.createElement(ChapterCard,{num:'07',title:'Apply for Loan',sub:'Guided 4-step wizard · Credit check · Instant decisions',accent:C.green})),

    /* 08 Profile  94–106s */
    React.createElement(Sprite,{start:94,end:106},
      React.createElement(ScreenShot,{src:'uploads/19_client_profile.png',fromScale:1.07,toScale:1.01,fromX:14,toX:-14,fromY:0,toY:0,dur:12,fadeIn:0.5,fadeOut:0.55}),
      React.createElement(Vignette),React.createElement(TopFade),React.createElement(BottomFade),
      React.createElement(ScreenLabel,{icon:'👤',label:'Client Profile',accent:true}),
      React.createElement(FeatureList,{accent:true,features:['Personal & Financial Info','Security & Declarations','Document Management','Full KYC Profile']}),
    ),
    React.createElement(Sprite,{start:94.5,end:98},
      React.createElement(ChapterCard,{num:'08',title:'Client Profile',sub:'KYC · Financial info · Security · Declarations',accent:C.green})),

    /* 09 Support  106–118s */
    React.createElement(Sprite,{start:106,end:118},
      React.createElement(ScreenShot,{src:'uploads/23_client_support.png',fromScale:1.07,toScale:1.01,fromX:0,toX:0,fromY:-10,toY:10,dur:12,fadeIn:0.5,fadeOut:0.55}),
      React.createElement(Vignette),React.createElement(TopFade),React.createElement(BottomFade),
      React.createElement(ScreenLabel,{icon:'🎧',label:'Support & About',accent:true}),
      React.createElement(FeatureList,{accent:true,features:['Email · Phone · WhatsApp','7 Branches Nationwide','24-Hour Support & Quick Turnaround','Compliance Code of Conduct']}),
    ),
    React.createElement(Sprite,{start:106.5,end:110},
      React.createElement(ChapterCard,{num:'09',title:'Support & About',sub:'24-hour support · 7 branches · Multi-channel help',accent:C.green})),

    /* ── SPLIT SCREENS ── */
    /* Split 1: White Label  118–126s */
    React.createElement(Sprite,{start:118,end:126}, React.createElement(SplitWhiteLabel)),

    /* Split 2: Full Stack  126–134s */
    React.createElement(Sprite,{start:126,end:134}, React.createElement(SplitFullStack)),

    /* Split 3: For Lenders / Borrowers  134–142s */
    React.createElement(Sprite,{start:134,end:142}, React.createElement(SplitForTwo)),

    /* ── INTEGRATIONS ── */
    React.createElement(Sprite,{start:142,end:147},
      React.createElement(SectionSeparator,{label:'Integrations',sub:'SureSystems · DebiCheck · Experian · SACCRA · WhatsApp',col:C.amber,colL:'#FCD34D'})),

    React.createElement(Sprite,{start:147,end:162}, React.createElement(IntegrationsHub)),

    /* ── FEATURES GRID  162–176s ── */
    React.createElement(Sprite,{start:162,end:176}, React.createElement(FeaturesGrid)),

    /* ── OUTRO  176–182s ── */
    React.createElement(Sprite,{start:176,end:TOTAL}, React.createElement(Outro)),
"""

pattern = re.compile(r'/\* INTRO  0–6\.5s \*/.*?/\* ── OUTRO  215–223s ── \*/\n    React\.createElement\(Sprite,\{start:215,end:TOTAL\}, React\.createElement\(Outro\)\),\n', re.DOTALL)
text = pattern.sub(new_sprites, text)

with open(path, 'w') as f:
    f.write(text)

