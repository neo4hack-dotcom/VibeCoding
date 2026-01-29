
import { Persona } from './types';

export const DEFAULT_FILES = [
  {
    name: 'src/App.tsx',
    language: 'typescript',
    content: `import React from 'react';
import { Layout, Server, Database, Globe, HardDrive } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8">
      <div className="max-w-3xl w-full text-center space-y-8">
        <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
          Full Stack Ready
        </h1>
        <p className="text-xl text-slate-400">
          Design the UI here. The backend logic resides in the <code>server/</code> folder 
          and handles multi-database connections (SQL, NoSQL, Analytics).
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
            <p className="text-sm text-slate-500 mt-2">Node.js + Services</p>
          </div>
          <div className="p-6 bg-slate-800 rounded-xl border border-slate-700 flex flex-col items-center">
            <HardDrive className="text-purple-400 mb-4" size={32} />
            <h3 className="text-lg font-semibold">Any Database</h3>
            <p className="text-sm text-slate-500 mt-2">Oracle, ClickHouse, Elastic...</p>
          </div>
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
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Example API Route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(\`Server running on http://localhost:\${PORT}\`);
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
   - Organize backend code into modules (e.g., \`server/routes/\`, \`server/controllers/\`, \`server/services/\`).
   - Do NOT put all logic in \`server/index.ts\`.

3. **Database Flexibility**:
   - You act as a Senior Data Engineer. You know how to connect to ANY database.
   - **Oracle**: Use \`oracledb\` library. Create a connection pool in \`server/db/oracle.ts\`.
   - **ClickHouse**: Use \`@clickhouse/client\`. Handle analytical queries in \`server/services/analytics.ts\`.
   - **Elasticsearch/OpenSearch**: Use \`@elastic/elasticsearch\` or \`@opensearch-project/opensearch\`.
   - **SQL**: Use \`pg\` (Postgres) or \`mysql2\`.
   - **MongoDB**: Use \`mongoose\`.
   - **ALWAYS** abstract the database connection logic into a dedicated file (e.g., \`server/config/db.ts\` or \`server/services/searchService.ts\`).

4. **Output Format**:
   - **CRITICAL**: Provide ONLY ONE file content per response.
   - If a feature requires modifying multiple files (e.g. a model AND a controller), do it step-by-step.

5. **Preview Limitation**:
   - The preview window ONLY runs the Frontend (React).
   - Backend code is NOT executed in the preview.
   - Explain to the user they must **Export** to connect to real databases like Oracle or ClickHouse.

6. **File Naming**:
   - Always prefix frontend files with \`src/\`.
   - Always prefix backend files with \`server/\`.`
  }
];

export const PERSONA_PROMPTS: Record<Persona, string> = {
  [Persona.ARCHITECT]: "You are a Software Architect. Plan the folder structure (src/ vs server/) and data models. Select the best database strategy (Relational vs Analytical vs Search) for the user's need.",
  [Persona.CODER]: "You are a Full Stack Engineer. You write clean React components and robust Node.js APIs. You know how to configure drivers for Oracle, ClickHouse, and Elastic.",
  [Persona.DEBUGGER]: "You are a Debugging Expert. You can spot issues in React lifecycles, API calls, and Database connection pools."
};

export const BASE_SYSTEM_PROMPT = `
You are Vibe Coding, an advanced Full Stack AI generator.

### PROJECT STRUCTURE
The project is split into two parts:
1. **Frontend (\`src/\`)**: Runs in the browser preview.
2. **Backend (\`server/\`)**: Node.js code. DOES NOT run in preview, but is included in the Export.

### INSTRUCTIONS
- When asked for a feature, implement both the UI (src) and the API (server).
- **ALWAYS** use the full path for filenames (e.g., \`server/models/User.ts\`).
- **Data Layer**: If the user mentions a specific DB (Oracle, ClickHouse, etc.), use the correct Node.js library for it.
- **One File Per Response**: Since you can only output one code block effectively, focus on one file at a time.
`;
