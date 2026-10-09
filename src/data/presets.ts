export interface PresetCategory {
  id: string;
  name: string;
  icon: string;
  questions: Array<{
    title: string;
    question: string;
    mode: 'balanced' | 'concise' | 'eli5' | 'steps' | 'technical';
    tag: string;
  }>;
}

export const PRESET_CATEGORIES: PresetCategory[] = [
  {
    id: 'tech',
    name: 'Technology & AI',
    icon: 'Cpu',
    questions: [
      {
        title: 'How do LLMs predict the next word?',
        question: 'How do Large Language Models (LLMs) learn and predict the next token mathematically and architecturally?',
        mode: 'technical',
        tag: 'AI Architecture',
      },
      {
        title: 'Explain Quantum Computing simply',
        question: 'What is quantum computing, what is a qubit, and how does superposition allow it to solve certain problems faster than classical computers?',
        mode: 'eli5',
        tag: 'Quantum Physics',
      },
      {
        title: 'Docker vs Kubernetes explained',
        question: 'What is the fundamental difference between Docker and Kubernetes, and when should a software team adopt each?',
        mode: 'balanced',
        tag: 'DevOps',
      },
      {
        title: 'How does modern WebRTC work?',
        question: 'How does WebRTC establish real-time peer-to-peer video streaming through NATs and firewalls using STUN, TURN, and ICE?',
        mode: 'technical',
        tag: 'Networking',
      },
    ],
  },
  {
    id: 'science',
    name: 'Science & Cosmos',
    icon: 'Atom',
    questions: [
      {
        title: 'Why does time slow down near black holes?',
        question: 'Why does gravitational time dilation occur according to Einstein’s General Relativity, and how has this been experimentally verified?',
        mode: 'balanced',
        tag: 'Astrophysics',
      },
      {
        title: 'How does CRISPR gene editing work?',
        question: 'Explain how CRISPR-Cas9 works as a molecular scissors to edit genomes, and what are the current limitations?',
        mode: 'eli5',
        tag: 'Biotechnology',
      },
      {
        title: 'Why is the sky blue and sunset red?',
        question: 'What is Rayleigh scattering, and why does Earth’s atmosphere scatter short wavelengths during the day and long wavelengths at sunset?',
        mode: 'balanced',
        tag: 'Atmospheric Physics',
      },
    ],
  },
  {
    id: 'practical',
    name: 'Guides & Productivity',
    icon: 'CheckCircle2',
    questions: [
      {
        title: 'Build a Spaced Repetition study plan',
        question: 'Provide a step-by-step method to build an Anki-style spaced repetition flashcard system to master a difficult topic in 30 days.',
        mode: 'steps',
        tag: 'Learning Guide',
      },
      {
        title: 'How to write an Executive Summary',
        question: 'Give me a structured step-by-step framework to write an executive summary that gets quick executive approval for a new initiative.',
        mode: 'steps',
        tag: 'Business',
      },
      {
        title: 'Overcoming cognitive biases in decisions',
        question: 'What are the top 3 cognitive biases that distort daily decision-making, and what practical mental debiasing checks can I apply?',
        mode: 'concise',
        tag: 'Mental Models',
      },
    ],
  },
  {
    id: 'logic',
    name: 'Logic & Philosophy',
    icon: 'Sparkles',
    questions: [
      {
        title: 'Explain Occam’s Razor with real cases',
        question: 'What is Occam’s Razor, how should it be correctly applied, and what are common traps where the simplest explanation is actually wrong?',
        mode: 'balanced',
        tag: 'Critical Thinking',
      },
      {
        title: 'Trolley Problem & Autonomous Vehicles',
        question: 'Explain the classic Trolley Problem and analyze how modern autonomous vehicle engineers and ethicists approach crash-optimization algorithms.',
        mode: 'balanced',
        tag: 'Ethics & AI',
      },
      {
        title: 'What is Fermi Estimation?',
        question: 'Explain Fermi estimation: how do physicists and engineers estimate impossible numbers using dimensional analysis and order-of-magnitude estimates?',
        mode: 'steps',
        tag: 'Problem Solving',
      },
    ],
  },
];
