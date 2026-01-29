import { Persona } from './types';

export const DEFAULT_FILES = [
  {
    name: 'App.tsx',
    language: 'typescript',
    content: `import React, { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
        Vibe Coding
      </h1>
      <div className="p-6 bg-slate-800 rounded-xl shadow-xl border border-slate-700 text-center">
        <p className="mb-4 text-slate-300">Start vibing with your code.</p>
        <button 
          onClick={() => setCount(c => c + 1)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-semibold"
        >
          Count is {count}
        </button>
      </div>
    </div>
  );
}`
  },
  {
    name: '.assistantrules',
    language: 'markdown',
    isSystem: true,
    content: `# Assistant Rules

1. Use Tailwind CSS for all styling.
2. Prefer React functional components with Hooks.
3. Code must be complete and functional.
4. No complex external dependencies other than React, Lucide-React, and Tailwind.`
  }
];

export const PERSONA_PROMPTS: Record<Persona, string> = {
  [Persona.ARCHITECT]: "You are an expert Software Architect. Analyze the request, structure the response, and propose a robust solution. Do not generate the full code immediately, plan first.",
  [Persona.CODER]: "You are a Senior React/Tailwind Developer. Generate clean, performant, and directly usable code. Focus on implementation.",
  [Persona.DEBUGGER]: "You are a Debugging Expert. Analyze the code, find logical or syntax errors, and propose precise fixes with logs."
};

export const BASE_SYSTEM_PROMPT = `
You are an expert coding assistant integrated into a React IDE.
The user sees a real-time preview.
IMPORTANT: If you generate code, ALWAYS provide the complete 'App' component exported by default, ready to run.
Do not use 'import' for external CSS files, use only Tailwind CSS.
Enclose your code in markdown blocks \`\`\`tsx ... \`\`\`.

AFTER the code block, provide a concise bullet-point summary of the changes made, bugs fixed, or actions taken.
Example format:
\`\`\`tsx
// code here
\`\`\`

### Summary
- Added feature X
- Fixed bug Y
`;