import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, ChevronRight, ChevronLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { db, doc, updateDoc, serverTimestamp } from '../lib/firebase';
import { cn } from '../lib/utils';

interface Question {
  id: number;
  text: string;
  category: 'mbti' | 'enneagram' | 'trait';
  trait?: string;
  options: { text: string; value: string | number }[];
}

const QUESTIONS: Question[] = [
  // MBTI Style
  {
    id: 1,
    category: 'mbti',
    text: "When you're at a social event, you usually:",
    options: [
      { text: "Interact with many people, including strangers", value: "E" },
      { text: "Interact with a few people you know well", value: "I" }
    ]
  },
  {
    id: 2,
    category: 'mbti',
    text: "You are more likely to be:",
    options: [
      { text: "Practical and realistic", value: "S" },
      { text: "Imaginative and theoretical", value: "N" }
    ]
  },
  {
    id: 3,
    category: 'mbti',
    text: "In making decisions, you rely more on:",
    options: [
      { text: "Logic and objective analysis", value: "T" },
      { text: "Values and how it affects others", value: "F" }
    ]
  },
  {
    id: 4,
    category: 'mbti',
    text: "You prefer to have things:",
    options: [
      { text: "Settled and decided", value: "J" },
      { text: "Open and flexible", value: "P" }
    ]
  },
  // Enneagram Style (Simplified for brevity but detailed enough)
  {
    id: 5,
    category: 'enneagram',
    text: "Your primary motivation is often:",
    options: [
      { text: "To be perfect and correct", value: "1" },
      { text: "To be loved and needed", value: "2" },
      { text: "To be successful and admired", value: "3" },
      { text: "To be unique and authentic", value: "4" },
      { text: "To be competent and knowledgeable", value: "5" },
      { text: "To be secure and supported", value: "6" },
      { text: "To be happy and excited", value: "7" },
      { text: "To be strong and in control", value: "8" },
      { text: "To be at peace and harmonious", value: "9" }
    ]
  },
  // Traits
  {
    id: 6,
    category: 'trait',
    trait: 'empathy',
    text: "How easily can you sense what others are feeling?",
    options: [
      { text: "Very easily", value: 90 },
      { text: "Somewhat easily", value: 60 },
      { text: "It takes effort", value: 30 },
      { text: "I struggle with this", value: 10 }
    ]
  },
  {
    id: 7,
    category: 'trait',
    trait: 'riskTolerance',
    text: "How do you feel about taking big risks for potential gains?",
    options: [
      { text: "I love the thrill", value: 90 },
      { text: "I'm okay with it if calculated", value: 60 },
      { text: "I prefer safety", value: 30 },
      { text: "I avoid risk at all costs", value: 10 }
    ]
  },
  {
    id: 8,
    category: 'trait',
    trait: 'discipline',
    text: "How good are you at sticking to a strict routine?",
    options: [
      { text: "Excellent", value: 90 },
      { text: "Good", value: 70 },
      { text: "Average", value: 50 },
      { text: "I prefer spontaneity", value: 20 }
    ]
  },
  {
    id: 9,
    category: 'trait',
    trait: 'creativity',
    text: "How often do you come up with unconventional ideas?",
    options: [
      { text: "Constantly", value: 90 },
      { text: "Frequently", value: 70 },
      { text: "Occasionally", value: 40 },
      { text: "Rarely", value: 10 }
    ]
  },
  {
    id: 10,
    category: 'trait',
    trait: 'resilience',
    text: "How quickly do you bounce back from failure?",
    options: [
      { text: "Almost immediately", value: 90 },
      { text: "After some reflection", value: 70 },
      { text: "It takes a while", value: 40 },
      { text: "I struggle to move on", value: 15 }
    ]
  }
  // Note: In a real app, we'd have 50-100 questions here. 
  // For this implementation, I'll include a representative set that covers all bases.
];

interface PersonalityAssessmentProps {
  userId: string;
  onComplete: () => void;
}

export default function PersonalityAssessment({ userId, onComplete }: PersonalityAssessmentProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAnswer = (questionId: number, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    if (currentStep < QUESTIONS.length - 1) {
      setTimeout(() => setCurrentStep(prev => prev + 1), 300);
    }
  };

  const calculateResults = () => {
    const mbti = [
      answers[1], answers[2], answers[3], answers[4]
    ].join('');

    const enneagram = answers[5];

    const traits: Record<string, number> = {
      empathy: answers[6] || 50,
      riskTolerance: answers[7] || 50,
      discipline: answers[8] || 50,
      creativity: answers[9] || 50,
      resilience: answers[10] || 50,
      love: 50, // Default values for traits not explicitly asked
      ambition: 50,
      anxiety: 50,
      curiosity: 50
    };

    return { mbti, enneagram, traits };
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const results = calculateResults();
      await updateDoc(doc(db, 'users', userId), {
        personalityProfile: {
          ...results,
          completedAt: serverTimestamp()
        }
      });
      onComplete();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = ((currentStep + 1) / QUESTIONS.length) * 100;
  const currentQuestion = QUESTIONS[currentStep];

  return (
    <div className="h-full flex flex-col bg-[#fafafa] p-6 overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full space-y-8 py-12">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-900 rounded-xl text-white">
                <Brain size={20} />
              </div>
              <h2 className="text-2xl font-serif italic text-zinc-900">Personality Assessment</h2>
            </div>
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
              Question {currentStep + 1} of {QUESTIONS.length}
            </span>
          </div>
          
          <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-zinc-900"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <h3 className="text-xl text-zinc-800 font-medium leading-relaxed">
              {currentQuestion.text}
            </h3>

            <div className="grid gap-3">
              {currentQuestion.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(currentQuestion.id, opt.value)}
                  className={cn(
                    "w-full text-left p-5 rounded-2xl border transition-all duration-200",
                    answers[currentQuestion.id] === opt.value
                      ? "bg-zinc-900 border-zinc-900 text-white shadow-lg"
                      : "bg-white border-zinc-100 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
                  )}
                >
                  <span className="text-sm font-medium">{opt.text}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between pt-8 border-t border-zinc-100">
          <button
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-zinc-900 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={18} />
            <span>Previous</span>
          </button>

          {currentStep === QUESTIONS.length - 1 && answers[currentQuestion.id] ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-zinc-900 text-white px-8 py-3 rounded-xl font-medium hover:bg-zinc-800 transition-all shadow-sm flex items-center gap-2"
            >
              {isSubmitting ? "Saving..." : "Complete Assessment"}
              <CheckCircle2 size={18} />
            </button>
          ) : (
            <div className="text-xs text-zinc-300 italic">
              Select an option to continue
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
