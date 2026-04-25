# DYCI Connect | Institutional Hub

DYCI Connect is a premium, centralized ecosystem designed for **Dr. Yanga's Colleges Inc.** It serves as the digital backbone for student governance, institutional resource management, and secure media broadcasting.

## 🚀 Key Modules

### 🛡️ Student Onboarding Gauntlet
A mandatory, state-managed three-gate sequence ensuring identity integrity:
1. **Security Update:** Forced password rotation for provisioned accounts.
2. **Legal Compliance:** Integrated split-pane Conforme (Institutional Agreement) module.
3. **Identity Audit:** Granular profile completion and verification system.

### 🕹️ SysAdmin Control Plane (Level 90)
A hardened administrative interface for institutional oversight:
- **User Provisioning:** Minimal-data batch student registration.
- **Security Watchtower:** Real-time database monitoring and RLS audit.
- **Role Isolation:** Strict governance between Students (L1), Staff, and System Admins.

### 📺 Video Broadcast Network
A high-performance media pipeline leveraging **Cloudflare R2**:
- Direct-to-R2 authenticated upload streams.
- Presigned URL governance for secure institutional content.
- L90-exclusive broadcast management.

## 💻 Tech Stack

- **Frontend:** React 19 + Vite 7 (TypeScript 5.9)
- **Styling:** Tailwind CSS 4 + Modern CSS Glassmorphism
- **Authentication:** Supabase Auth (JWT Enforcement)
- **Database:** Supabase PostgreSQL with Strict RLS Policies
- **Media Storage:** Cloudflare R2 (S3-Compatible) via Presigned Pipelines
- **State Management:** React Context + Persistent Auth Guards

## 🛠️ Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ghostbyte1014/dyci_connect.git
   cd dyci_connect
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   Create a `.env.local` file with the following keys:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_STORAGE_API_URL=your_r2_worker_url
   ```

4. **Launch Development:**
   ```bash
   npm run dev
   ```

---
© 2026 Dr. Yanga's Colleges Inc. | Developed for Institutional Excellence.
