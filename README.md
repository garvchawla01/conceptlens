# ConceptLens 🔍

> **AI Conceptual Diagnostic Engine** · Find exactly which concepts you're weak in, in 5 minutes.

ConceptLens is an AI-powered diagnostic platform built for students across **Classes 9–12** (CBSE, ICSE, and State Boards). Instead of merely testing whether an answer is right or wrong, ConceptLens pinpoints conceptual traps, boundary oversights, and reasoning gaps using targeted edge-case diagnostics.

---

## ✨ Features

- **Diagnostic Assessments:** Generates adaptive questions exposing edge-case misconceptions in specific subjects and chapters.
- **Root Cause Analysis:** Highlights specific reasoning gaps and provides tailored remedial recommendations.
- **Syllabus Coverage:** Built-in curriculum mapping across Class 9 to 12 for CBSE, ICSE, and State Boards.
- **KaTeX Mathematical Rendering:** Clear, LaTeX-accurate typesetting for complex formulas, equations, and science notation.
- **Dark Glassmorphic UI:** Built with Next.js 16 and Tailwind CSS v4 for a fast, responsive interface.

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router & Turbopack)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **AI Engine:** Google Generative AI (`gemini-3.8-flash`)
- **Math Formatting:** KaTeX (`katex`, `react-katex`)
- **Language:** TypeScript

---

## 🚀 Getting Started

### 1. Clone the repository
\`\`\`bash
git clone https://github.com/garvchawla01/conceptlens.git
cd conceptlens
\`\`\`

### 2. Install dependencies
\`\`\`bash
npm install
\`\`\`

### 3. Setup environment variables
Create a `.env.local` file in the root directory and add your Google Gemini API key:
\`\`\`env
GEMINI_API_KEY=your_gemini_api_key_here
\`\`\`

### 4. Run the development server
\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Production Build

To test production compilation locally:
\`\`\`bash
npm run build
\`\`\`