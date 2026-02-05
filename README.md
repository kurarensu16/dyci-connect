# DYCI Connect Student Handbook

DYCI Connect is a modern, accessible digital version of the Dr. Yanga's Colleges Inc. Student Handbook. Designed to provide students with quick access to campus policies, academic guidelines, and student services, this project aims to replace bulky physical booklets with a streamlined, searchable mobile or web experience.

# Features
  - Smart Search: Quickly find specific rules, sections, or keywords.
  - Offline Access: View essential handbook information even without an active internet connection.
  - Categorized Sections: Easy navigation through Academic Policies, Code of Conduct, and Campus Services.
  - Responsive Design: Optimized for both desktop and mobile devices.


# Tech Stack

  - Frontend: React.js / Vite
  - Styling: Tailwind CSS
  - Backend/Database: Supabase 
  - State Management: Zustand or React Context API

# Installation & Setup
1. Clone the repository:

git clone https://github.com/your-username/dyci-connect-handbook.git
cd dyci-connect-handbook

2. Install dependencies:

npm install

3. Set up Environment Variables: Create a .env.local file in the root directory and add your keys:

PUBLIC_SUPABASE_URL=your_url
PUBLIC_SUPABASE_ANON_KEY=your_key

4. Run the development server:

npm run dev
