dyci-connect/
├─ public/
│  ├─ icons/
│  ├─ manifest.json
│  └─ favicon.ico
│
├─ src/
│  ├─ assets/
│  ├─ components/
│  │  ├─ auth/                       # Login, Signup, ForgotPassword
│  │  ├─ dashboard/                  # Shared dashboard components
│  │  │  ├─ widgets/
│  │  │  └─ charts/
│  │  ├─ handbook/
│  │  ├─ faq/
│  │  ├─ fileUpload/
│  │  ├─ navbar/
│  │  └─ ui/
│  │
│  ├─ contexts/
│  │  └─ AuthContext.jsx              # Holds current user info & role
│  │
│  ├─ hooks/
│  │  └─ useAuth.js
│  │
│  ├─ lib/
│  │  └─ supabaseClient.js
│  │
│  ├─ pages/
│  │  ├─ Home.jsx
│  │  ├─ auth/                        # Login, Signup, ResetPassword
│  │  ├─ student/                     # Student-specific pages
│  │  │  ├─ Dashboard.jsx
│  │  │  ├─ Handbook.jsx
│  │  │  ├─ Files.jsx
│  │  │  └─ GWA.jsx
│  │  ├─ faculty/                     # Faculty-specific pages
│  │  │  ├─ Dashboard.jsx
│  │  │  ├─ Handbook.jsx
│  │  │  └─ FAQ.jsx
│  │  └─ admin/                       # Admin pages
│  │     ├─ Dashboard.jsx
│  │     ├─ ManageUsers.jsx
│  │     ├─ ManageHandbook.jsx
│  │     └─ Reports.jsx
│  │
│  ├─ services/
│  │  ├─ handbookService.js
│  │  ├─ fileService.js
│  │  ├─ faqService.js
│  │  └─ authService.js
│  │
│  ├─ styles/
│  │  ├─ globals.css
│  │  └─ tailwind.css
│  │
│  ├─ utils/
│  │  ├─ formatDate.js
│  │  ├─ validateInput.js
│  │  └─ constants.js
│  │
│  ├─ App.jsx
│  └─ main.jsx
│
├─ functions/
│  ├─ retrieveHandbook/
│  ├─ faqHandler/
│  └─ fileMetadata/
│
├─ tests/
├─ .env
├─ vite.config.js
├─ tailwind.config.cjs
├─ package.json
└─ README.md
