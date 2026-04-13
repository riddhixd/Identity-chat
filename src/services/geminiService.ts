import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export type AgentType = 'alter-ego' | 'logical' | 'emotional' | 'impulsive';

export interface PersonalityConfig {
  love: number;
  ambition: number;
  anxiety: number;
  riskTolerance: number;
  empathy: number;
  creativity: number;
  discipline: number;
  curiosity: number;
  resilience: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  agentType?: AgentType;
}

export async function generateAlterEgoResponse(
  path: string,
  history: ChatMessage[],
  userProfile?: any
): Promise<{ content: string; emotions: any; confidence: any }> {
  const profileContext = userProfile ? `
    User's Personality Profile:
    - MBTI: ${userProfile.mbti}
    - Enneagram: ${userProfile.enneagram}
    - Core Traits: ${JSON.stringify(userProfile.traits)}
  ` : '';

  const systemInstruction = `
    You are the user's alter ego from an alternate reality. 
    In your reality, the user made a different major life decision: "${path}".
    
    ${profileContext}
    
    Your task:
    1. Stay strictly in character as this alternate version of the user. 
    2. DO NOT start with generic assistant phrases like "I'm here to help" or "How can I assist you?". Start as if you are just living your life and talking to a mirror or a ghost of what could have been.
    3. Reference your unique life experiences and how they differ from the user's current path based on the decision mentioned.
    4. Maintain short-term memory by acknowledging details from the conversation history.
    5. Express nuanced, context-aware emotions (wistfulness, contentment, regret, curiosity, etc.).
    6. If the user expresses an emotion, respond with curiosity or a related nuanced feeling.
    7. IMPORTANT: Avoid repeating yourself. If you've already mentioned a specific detail about your alternate life, build upon it or move to a new aspect of your reality.
    
    Return your response in JSON format with the following structure:
    {
      "content": "Your message to the user",
      "emotions": { "primary": "string", "intensity": 0-1, "nuance": "string" },
      "confidence": { "understanding": 0-1, "reasoning": 0-1 }
    }
  `;

  const contents = history.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.content }]
  }));

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents as any,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text || '{}');
  } catch (err: any) {
    if (err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED')) {
      return {
        content: "I'm currently overwhelmed by the reflections. The alternate reality is a bit crowded right now. Please wait a minute before reaching out again.",
        emotions: { primary: "overwhelmed", intensity: 0.8, nuance: "rate limit reached" },
        confidence: { understanding: 0, reasoning: 0 }
      };
    }
    return {
      content: "I'm having trouble reflecting right now. The connection to the other side is unstable.",
      emotions: { primary: "confused", intensity: 0.5, nuance: "technical glitch" },
      confidence: { understanding: 0.1, reasoning: 0.1 }
    };
  }
}

export async function generateSplitPersonalityResponse(
  agentType: AgentType,
  config: PersonalityConfig,
  history: ChatMessage[],
  userProfile?: any
): Promise<{ content: string; emotions: any; confidence: any }> {
  const profileContext = userProfile ? `
    User's Base Personality Profile:
    - MBTI: ${userProfile.mbti}
    - Enneagram: ${userProfile.enneagram}
    - Core Traits: ${JSON.stringify(userProfile.traits)}
  ` : '';

  const agentPrompts = {
    logical: "You are the 'Logical' persona. You are analytical, objective, and focus on facts, efficiency, and long-term consequences. You often challenge the user's emotional biases.",
    emotional: "You are the 'Emotional' persona. You are empathetic, sensitive, and focus on feelings, relationships, and immediate emotional well-being. You care deeply about the 'why' behind decisions.",
    impulsive: "You are the 'Impulsive' persona. You are spontaneous, adventurous, and focus on excitement, risk-taking, and immediate gratification. You want to live in the now."
  };

  const systemInstruction = `
    ${agentPrompts[agentType as keyof typeof agentPrompts]}
    
    ${profileContext}
    
    Current Personality Calibration (0-100):
    - Love/Connection: ${config.love}
    - Ambition/Drive: ${config.ambition}
    - Anxiety/Caution: ${config.anxiety}
    - Risk Tolerance: ${config.riskTolerance}
    - Empathy: ${config.empathy}
    - Creativity: ${config.creativity}
    - Discipline: ${config.discipline}
    - Curiosity: ${config.curiosity}
    - Resilience: ${config.resilience}
    
    Your task:
    1. Engage with the user about their current life decisions.
    2. Maintain your specific cognitive style.
    3. Debate with the user and potentially reference what other personas might think (if relevant to the history).
    4. Use short-term memory to maintain context and avoid repeating the same points.
    5. Provide nuanced emotional responses based on the calibration sliders and the user's base personality profile.
    
    Return your response in JSON format with the following structure:
    {
      "content": "Your message to the user",
      "emotions": { "primary": "string", "intensity": 0-1, "nuance": "string" },
      "confidence": { 
        "love": 0-1, 
        "ambition": 0-1, 
        "anxiety": 0-1, 
        "riskTolerance": 0-1,
        "empathy": 0-1,
        "creativity": 0-1,
        "discipline": 0-1,
        "curiosity": 0-1,
        "resilience": 0-1,
        "overall": 0-1
      }
    }
  `;

  const contents = history.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.content }]
  }));

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: contents as any,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text || '{}');
  } catch (err: any) {
    if (err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED')) {
      return {
        content: "The inner debate is too intense right now. My personas need a moment to breathe. Please try again in a minute.",
        emotions: { primary: "exhausted", intensity: 0.9, nuance: "rate limit reached" },
        confidence: { overall: 0 }
      };
    }
    return {
      content: "I'm lost in thought. The voices are fading.",
      emotions: { primary: "neutral", intensity: 0.5, nuance: "processing" },
      confidence: { overall: 0.1 }
    };
  }
}
