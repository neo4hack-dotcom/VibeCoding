
import JSZip from 'jszip';
import { Project, FileData, ProjectBackup, Settings } from '../types';

// --- ZIP EXPORT (DEPLOYMENT) ---
export const exportProjectToZip = async (project: Project) => {
  const zip = new JSZip();

  // --- CONFIGURATION DU PROJET FULL STACK ---
  
  const packageJson = {
    "name": project.name.toLowerCase().replace(/\s+/g, '-'),
    "version": "1.0.0",
    "type": "module",
    "scripts": {
      "dev": "concurrently \"npm run server\" \"npm run client\"",
      "client": "vite",
      "server": "tsx watch server/index.ts",
      "build": "tsc && vite build",
      "preview": "vite preview"
    },
    "dependencies": {
      "express": "^4.18.2",
      "cors": "^2.8.5",
      "dotenv": "^16.3.1",
      "mongoose": "^8.0.3",
      "pg": "^8.11.3",
      "mysql2": "^3.6.5",
      "oracledb": "^6.3.0",
      "@clickhouse/client": "^0.2.6",
      "@elastic/elasticsearch": "^8.11.0",
      "@opensearch-project/opensearch": "^2.5.0",
      "ioredis": "^5.3.2",
      "react": "^18.2.0",
      "react-dom": "^18.2.0",
      "lucide-react": "^0.292.0",
      "framer-motion": "^10.16.4",
      "recharts": "^2.10.3"
    },
    "devDependencies": {
      "concurrently": "^8.2.2",
      "tsx": "^4.7.1",
      "@types/node": "^20.10.5",
      "@types/react": "^18.2.43",
      "@types/react-dom": "^18.2.17",
      "@types/express": "^4.17.21",
      "@types/cors": "^2.8.17",
      "@vitejs/plugin-react": "^4.2.1",
      "autoprefixer": "^10.4.16",
      "postcss": "^8.4.32",
      "tailwindcss": "^3.4.0",
      "typescript": "^5.3.3",
      "vite": "^5.0.8"
    }
  };
  zip.file("package.json", JSON.stringify(packageJson, null, 2));

  const tsConfig = {
    "compilerOptions": {
      "target": "ES2022",
      "useDefineForClassFields": true,
      "lib": ["ES2022", "DOM", "DOM.Iterable"],
      "module": "ESNext",
      "skipLibCheck": true,
      "moduleResolution": "bundler",
      "allowImportingTsExtensions": true,
      "resolveJsonModule": true,
      "isolatedModules": true,
      "noEmit": true,
      "jsx": "react-jsx",
      "strict": true,
      "noUnusedLocals": false,
      "noUnusedParameters": false,
      "noFallthroughCasesInSwitch": true,
      "esModuleInterop": true
    },
    "include": ["src", "server"],
  };
  zip.file("tsconfig.json", JSON.stringify(tsConfig, null, 2));

  zip.file("vite.config.ts", `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
})
`);

  zip.file("tailwind.config.js", `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
`);

  zip.file("postcss.config.js", `export default { plugins: { tailwindcss: {}, autoprefixer: {}, }, }`);

  // CORRECTION ICI : src="/src/main.tsx" au lieu de src="/src/App.tsx"
  zip.file("index.html", `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${project.name}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script> 
  </body>
</html>
`); 

  const srcFolder = zip.folder("src");
  const serverFolder = zip.folder("server");

  srcFolder?.file("main.tsx", `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`);
  srcFolder?.file("index.css", `@tailwind base; @tailwind components; @tailwind utilities;`);

  project.files.forEach((file: FileData) => {
    const cleanName = file.name.replace(/^\.\//, '');

    if (cleanName.startsWith('server/')) {
        const fileName = cleanName.replace('server/', '');
        serverFolder?.file(fileName, file.content);
    } else if (cleanName.startsWith('src/')) {
        const fileName = cleanName.replace('src/', '');
        srcFolder?.file(fileName, file.content);
    } else if (cleanName === 'App.tsx') {
        srcFolder?.file('App.tsx', file.content);
    } else if (cleanName.endsWith('.md') || cleanName.endsWith('.json')) {
        zip.file(cleanName, file.content);
    } else {
        if (cleanName.endsWith('.tsx') || cleanName.endsWith('.ts') || cleanName.endsWith('.css')) {
            srcFolder?.file(cleanName, file.content);
        }
    }
  });

  zip.file(".env", `PORT=3000
DATABASE_URL=postgres://user:pass@localhost:5432/myapp
MONGO_URI=mongodb://localhost:27017/myapp
CLICKHOUSE_URL=http://localhost:8123
ELASTIC_NODE=http://localhost:9200
ORACLE_CONN_STRING=localhost:1521/XEPDB1`);

  const blob = await zip.generateAsync({ type: "blob" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.name.replace(/\s+/g, '_')}_FullStack.zip`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

// --- BACKUP JSON (FULL STATE) ---

export const downloadBackup = (backup: ProjectBackup) => {
    const jsonString = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${backup.project.name.replace(/\s+/g, '_')}_Backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
};

export const parseBackupFile = async (file: File): Promise<ProjectBackup> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                // Validation basique
                if (!json.project || !json.files && !json.project.files) {
                    throw new Error("Invalid Vibe backup file.");
                }
                resolve(json);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsText(file);
    });
};

// --- GITHUB INTEGRATION ---

export const publishToGitHub = async (
    settings: Settings, 
    project: Project, 
    message: string = "Update from Vibe Coding"
): Promise<string> => {
    if (!settings.github?.token || !settings.github?.repo) {
        throw new Error("GitHub config missing.");
    }

    const { token, repo } = settings.github;
    const branch = settings.github.branch || "main";
    const baseUrl = `https://api.github.com/repos/${repo}`;
    const headers = {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
    };

    // 1. Vérifier si le repo existe
    const repoCheck = await fetch(baseUrl, { headers });
    if (!repoCheck.ok) throw new Error(`Repository not found (${repoCheck.status}). Check permissions.`);

    let successCount = 0;
    const errors: string[] = [];
    
    const filesToPush = project.files.filter(f => !f.isSystem); // On ignore les fichiers système

    for (const file of filesToPush) {
        try {
            const filePath = file.name.startsWith('./') ? file.name.slice(2) : file.name;
            const url = `${baseUrl}/contents/${filePath}`;
            
            // On doit d'abord récupérer le SHA si le fichier existe pour faire un update
            let sha: string | undefined;
            const getRes = await fetch(`${url}?ref=${branch}`, { headers });
            if (getRes.ok) {
                const data = await getRes.json();
                sha = data.sha;
            }

            // Encodage du contenu en Base64 (UTF-8 safe)
            const contentEncoded = btoa(unescape(encodeURIComponent(file.content)));

            const body: any = {
                message: message,
                content: contentEncoded,
                branch: branch
            };
            if (sha) body.sha = sha;

            const putRes = await fetch(url, {
                method: 'PUT',
                headers,
                body: JSON.stringify(body)
            });

            if (!putRes.ok) {
                const errData = await putRes.json();
                errors.push(`${file.name}: ${errData.message}`);
            } else {
                successCount++;
            }
        } catch (e: any) {
            errors.push(`${file.name}: ${e.message}`);
        }
    }

    if (errors.length > 0) {
        throw new Error(`Partial success (${successCount} uploaded). Errors: ${errors.join(', ')}`);
    }

    return `Successfully pushed ${successCount} files to ${repo}/${branch}`;
};
