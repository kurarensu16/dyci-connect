# DYCI Connect Student Handbook

DYCI Connect is a modern, accessible digital version of the Dr. Yanga's Colleges Inc. Student Handbook. Designed to provide students with quick access to campus policies, academic guidelines, and student services, this project aims to replace bulky physical booklets with a streamlined, searchable mobile or web experience.

# Features
  - Smart Search: Quickly find specific rules, sections, or keywords.
  - Offline Access: View essential handbook information even without an active internet connection.
  - Categorized Sections: Easy navigation through Academic Policies, Code of Conduct, and Campus Services.
  - Responsive Design: Optimized for both desktop and mobile devices.


# Tech Stack

**Frontend:**
- **Framework:** Vite 7.2, React 19.2
- **Language:** TypeScript 5.9
- **Routing:** React Router DOM 7.10
- **Styling:** Tailwind CSS 4.1
- **Icons:** react-icons 5.5, material-icons 1.13
- **State/Utils:** React Context API (AuthContext), react-hot-toast
- **Auth:** Supabase Auth (client-side)

**Backend:**
- **BaaS:** Supabase (API, Auth)
- **Auth:** Supabase Auth with JWT (client + Supabase)
- **Validation:** TypeScript types, Supabase RLS

**Storage (student files):**
- **Provider:** Cloudflare R2 (S3-compatible), accessed via a storage API (e.g. Cloudflare Worker) that issues presigned URLs

**Database:**
- **Provider:** Supabase (PostgreSQL)

# Installation & Setup
1. Clone the repository:

git clone https://github.com/your-username/dyci-connect-handbook.git
cd dyci-connect-handbook

2. Install dependencies:

npm install

3. Set up Environment Variables: Create a `.env.local` file in the root directory and add your keys:

- `VITE_SUPABASE_URL` — your Supabase project URL  
- `VITE_SUPABASE_ANON_KEY` — your Supabase anonymous key  
- `VITE_STORAGE_API_URL` — (optional) base URL of your student file-storage API (e.g. Cloudflare Worker) that uses Cloudflare R2; if omitted, the Files page uses mock data.

**Storage API contract (for your R2 backend):** The frontend expects the following endpoints, with `Authorization: Bearer <Supabase JWT>` for auth. List: `GET /api/storage?prefix=students/{userId}/` → `{ objects: [{ id, name, size, type, key, uploadedAt }], totalSize }`. Upload URL: `POST /api/storage/upload-url` body `{ key, contentType }` → `{ url, key }` (presigned PUT). Download URL: `GET /api/storage/download-url?key=...` → `{ url }`. Delete: `DELETE /api/storage?key=...`.

4. Run the development server:

npm run dev
