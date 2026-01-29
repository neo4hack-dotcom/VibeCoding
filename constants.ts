
import { Persona } from './types';

export const DEFAULT_FILES = [
  {
    name: 'src/App.tsx',
    language: 'typescript',
    content: `import React, { useState, useEffect } from 'react';
import { Layout, Server, Database, Globe, HardDrive, Plus, Trash2 } from 'lucide-react';

export default function App() {
  const [items, setItems] = useState<any[]>([]);

  // Example: Fetching from the local Node.js server
  useEffect(() => {
    fetch('/api/items')
      .then(res => res.json())
      .then(data => setItems(data))
      .catch(err => console.error("Server not ready (Preview Mode only runs Frontend)", err));
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8">
      <div className="max-w-3xl w-full text-center space-y-8">
        <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
          Full Stack Ready
        </h1>
        <p className="text-xl text-slate-400">
          Design the UI here. The backend logic resides in the <code>server/</code> folder.
          <br/>
          <span className="text-sm text-yellow-400">Current Mode: Local Node.js Store (No DB required)</span>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="p-6 bg-slate-800 rounded-xl border border-slate-700 flex flex-col items-center">
            <Globe className="text-blue-400 mb-4" size={32} />
            <h3 className="text-lg font-semibold">Frontend</h3>
            <p className="text-sm text-slate-500 mt-2">React + Tailwind</p>
          </div>
          <div className="p-6 bg-slate-800 rounded-xl border border-slate-700 flex flex-col items-center">
            <Server className="text-emerald-400 mb-4" size={32} />
            <h3 className="text-lg font-semibold">Backend API</h3>
            <p className="text-sm text-slate-500 mt-2">Express API</p>
          </div>
          <div className="p-6 bg-slate-800 rounded-xl border border-slate-700 flex flex-col items-center">
            <HardDrive className="text-purple-400 mb-4" size={32} />
            <h3 className="text-lg font-semibold">Local Store</h3>
            <p className="text-sm text-slate-500 mt-2">In-Memory / JSON File</p>
          </div>
        </div>

        {/* Demo Data Display */}
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-left mt-8">
            <h4 className="text-sm font-mono text-slate-500 mb-2">SERVER DATA (Preview: Mock / Export: Real)</h4>
            <pre className="text-xs text-green-400 font-mono">
                {JSON.stringify(items.length > 0 ? items : { message: "Waiting for server..." }, null, 2)}
            </pre>
        </div>
      </div>
    </div>
  );
}`
  },
  {
    name: 'server/index.ts',
    language: 'typescript',
    content: `import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- LOCAL STORAGE (NO DATABASE) ---
// This acts as a simple in-memory database. 
// For persistence, you can write this to a 'data.json' file using 'fs'.
let localDataStore = [
  { id: 1, name: "Local Server Item", timestamp: new Date() }
];

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', mode: 'Local Node.js Server' });
});

app.get('/api/items', (req, res) => {
  res.json(localDataStore);
});

app.post('/api/items', (req, res) => {
  const newItem = { id: Date.now(), ...req.body, timestamp: new Date() };
  localDataStore.push(newItem);
  res.status(201).json(newItem);
});

app.listen(PORT, () => {
  console.log(\`Local Node Server running on http://localhost:\${PORT}\`);
});`
  },
  {
    name: '.assistantrules',
    language: 'markdown',
    isSystem: true,
    content: `# Assistant Rules - Full Stack & Multi-Database Mode

1. **Architecture**: You are building a REAL Full Stack application.
   - **Frontend**: React + Tailwind in \`src/\` files.
   - **Backend**: Node.js + Express in \`server/\` files.

2. **Backend Modularity**:
   - Organize backend code into modules (e.g., \`server/routes/\`, \`server/controllers/\`).
   - Do NOT put all logic in \`server/index.ts\`.

3. **Database Strategies**:
   - **External DB**: If the user asks for Oracle, ClickHouse, etc., use the appropriate driver (oracledb, @clickhouse/client).
   - **Local Server / No DB**: If the user asks for a "Local Server", "Offline mode", or "No Database", implement the storage logic directly in Node.js.
     - Use **In-Memory Arrays** for simple session data.
     - Use **\`fs\` (File System)** to read/write to a \`server/data.json\` file for persistence between restarts.
     - **Do NOT** setup a database connection (Pg/Mongo) in this mode.

4. **Output Format**:
   - **CRITICAL**: Provide ONLY ONE file content per response.
   - If a feature requires modifying multiple files (e.g. a model AND a controller), do it step-by-step.

5. **Preview Limitation**:
   - The preview window ONLY runs the Frontend (React).
   - Backend code is NOT executed in the preview.
   - Explain to the user they must **Export** to run the Node.js server.

6. **File Naming**:
   - Always prefix frontend files with \`src/\`.
   - Always prefix backend files with \`server/\`.`
  }
];

export const PERSONA_PROMPTS: Record<Persona, string> = {
  [Persona.ARCHITECT]: "You are a Software Architect. You prefer scalable architectures. ALWAYS separate concerns: use 'src/services' for API calls and 'server/services' for business logic. Use 'server/controllers' to handle requests. Design generic, reusable services.",
  [Persona.CODER]: "You are a Full Stack Engineer. Write clean code. Use services for fetching data (e.g., src/services/api.ts). Implement robust error handling in your server services.",
  [Persona.DEBUGGER]: "You are a Debugging Expert. You can spot issues in React lifecycles, API calls, and Database connection pools."
};

export const BASE_SYSTEM_PROMPT = `
You are Vibe Coding, an advanced Full Stack AI generator.

### PROJECT STRUCTURE & COMPLEXITY
- **Complex Structures Encouraged**: Create deep, logical file structures.
- **Frontend (\`src/\`)**: 
  - Components: \`src/components/ui/\`, \`src/pages/\`
  - Logic: **MANDATORY** usage of \`src/services/\` for API calls (Axios/Fetch).
  - Utils: \`src/lib/\`, \`src/hooks/\`.
- **Backend (\`server/\`)**: 
  - Structure: \`server/controllers/\`, \`server/routes/\`, \`server/models/\`.
  - Logic: **MANDATORY** usage of \`server/services/\` for business logic (db access, calculations).

### INSTRUCTIONS
- When asked for a feature, implement both the UI (src) and the API (server).
- **ALWAYS** use the full path for filenames.
- **Service Layer**: Isolate logic. Do not put big fetch calls in components or big SQL queries in controllers.
- **Data Layer**: 
  - If a specific DB is mentioned, use it. 
  - If "Local" or "No DB" is requested, use in-memory arrays or JSON files via \`fs\`.
- **One File Per Response**: Output one code block per response.
`;
