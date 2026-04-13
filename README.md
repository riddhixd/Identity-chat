# Identity Mirror 🪞

**🌐 Live Demo: [Identity Mirror](https://ais-pre-vdysxbqz74aisankcqzx4t-821186356169.asia-southeast1.run.app)**

Identity Mirror is a sophisticated, AI-powered web application designed for deep self-reflection, psychological exploration, and decision-making analysis. By leveraging advanced Large Language Models (Gemini), the application allows users to converse with alternate versions of themselves and simulate internal debates among different facets of their personality.

## 🌟 Core Features

### 1. Identity Profile & Assessment
Before diving into reflections, users complete a comprehensive personality assessment.
* **Psychological Frameworks**: Incorporates elements of MBTI, Enneagram, and core behavioral traits (Empathy, Risk Tolerance, Discipline, Creativity, Resilience).
* **AI Shaping**: The results of this assessment are saved to the user's profile and dynamically injected into the AI's system prompts, ensuring that all alternate egos and personas react in a way that is fundamentally rooted in the user's actual psychological baseline.

### 2. Alter Ego Chat (The Path Not Taken)
* **Concept**: Users describe a major life decision they *didn't* take (e.g., "I chose to study engineering instead of pursuing music").
* **Execution**: The AI adopts the persona of the user from that alternate reality. 
* **Nuance**: The AI maintains strict character consistency, referencing its unique life experiences, expressing nuanced emotions (wistfulness, contentment, regret), and reacting to the user's current reality.

### 3. Split Personality Mode (Inner Debate)
* **Concept**: A multi-agent debate system to help users process current life decisions.
* **The Agents**: 
  * 🧠 **Logical**: Analytical, objective, focused on facts and long-term consequences.
  * ❤️ **Emotional**: Empathetic, sensitive, focused on relationships and well-being.
  * ⚡ **Impulsive**: Spontaneous, adventurous, focused on excitement and the present moment.
* **Calibration Panel**: Users can dynamically adjust 9 different personality sliders (Love, Ambition, Anxiety, Risk Tolerance, Empathy, Creativity, Discipline, Curiosity, Resilience) to fine-tune the agents' cognitive styles in real-time.
* **Sequential Debate**: The agents respond sequentially, building on the user's input and arguing with each other's perspectives.

### 4. Advanced Chat Management
* **Cloud Persistence**: All chats are securely saved to Firebase Firestore, tied to the user's Google account.
* **Custom Naming**: Users are prompted to name their chats upon saving, and can double-click any chat in the sidebar to rename it inline.
* **Search & Filter**: A robust sidebar search allows users to instantly filter through their saved history across different modes.

---

## 🛡️ AI Architecture & Guardrails

Identity Mirror implements strict guardrails to ensure the AI behaves as a psychological tool rather than a generic chatbot.

### 1. Strict Roleplay Enforcement
* **No "Assistant" Speak**: The AI is explicitly instructed *never* to use generic helpful phrases like "I'm here to help" or "As an AI...". It must start and remain entirely in character as a human variant.
* **Contextual Memory**: The application passes the chat history back to the model with every request, forcing the AI to maintain short-term memory and avoid repeating itself.

### 2. Structured JSON Outputs
To power the complex UI, the Gemini API is forced to return responses in a strict JSON schema (`responseMimeType: "application/json"`). The schema includes:
* `content`: The actual message text.
* `emotions`: Primary emotion, intensity (0-1), and nuance (e.g., "wistful", "processing").
* `confidenceMetrics`: Real-time percentages showing how confident the AI is in its understanding of the user's traits based on the current context.

### 3. Graceful Rate Limit Handling (429 Guardrails)
If the user hits the Gemini API rate limits (`RESOURCE_EXHAUSTED`), the application intercepts the error and returns an *in-character* response instead of crashing:
* *Alter Ego*: "I'm currently overwhelmed by the reflections. The alternate reality is a bit crowded right now. Please wait a minute..."
* *Split Personality*: "The inner debate is too intense right now. My personas need a moment to breathe..."

### 4. Dynamic Prompt Injection
The AI's behavior isn't static. The `geminiService.ts` dynamically constructs the system instruction by combining:
1. The base agent prompt.
2. The user's completed Identity Profile (MBTI, Enneagram, Traits).
3. The current state of the 9 Calibration Sliders.

---

## 💻 Tech Stack

* **Frontend Framework**: React 19 + Vite
* **Styling**: Tailwind CSS v4
* **Animations**: Framer Motion (`motion/react`)
* **Icons**: Lucide React
* **Backend / Auth / DB**: Firebase (Authentication, Firestore)
* **AI / LLM**: Google Gen AI SDK (`@google/genai`)
  * *Alter Ego*: Uses `gemini-3-flash-preview` for fast, conversational responses.
  * *Split Personality*: Uses `gemini-3.1-pro-preview` for complex, multi-agent reasoning.

---

## 🚀 Setup & Installation

### Prerequisites
* Node.js (v18+ recommended)
* A Firebase Project (with Authentication and Firestore enabled)
* A Google Gemini API Key

### Installation Steps

1. **Clone the repository**
   \`\`\`bash
   git clone <repository-url>
   cd identity-mirror
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Environment Variables**
   Create a `.env` file in the root directory and add your Gemini API key:
   \`\`\`env
   GEMINI_API_KEY="your_gemini_api_key_here"
   \`\`\`

4. **Firebase Configuration**
   Ensure your `firebase-applet-config.json` is present in the root directory with your Firebase project credentials.

5. **Run the Development Server**
   \`\`\`bash
   npm run dev
   \`\`\`

---

## 🔒 Security & Database Rules

The application uses strict Firestore Security Rules to ensure data privacy:
* **Default Deny**: All access is denied by default.
* **Ownership Checks**: Users can only read, create, and update documents where the `userId` matches their authenticated `request.auth.uid`.
* **Schema Validation**: Rules enforce that incoming data matches the expected schema (e.g., ensuring `title` is a string under 200 characters, `content` is under 5000 characters).
* **Immutable Messages**: Once an AI or User message is written to the database, it cannot be altered (`allow update: if false;`).

## 🤝 Contributing
Contributions are welcome! Whether it's adding new psychological frameworks to the assessment, creating new debate personas, or refining the UI. Please feel free to submit a Pull Request.
