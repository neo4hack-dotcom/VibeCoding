
import JSZip from 'jszip';
import { Project, FileData } from '../types';

export const exportProjectToZip = async (project: Project) => {
  const zip = new JSZip();

  // --- CONFIGURATION DU PROJET FULL STACK ---
  
  // package.json unique pour la racine (Monorepo simplifié)
  const packageJson = {
    "name": project.name.toLowerCase().replace(/\s+/g, '-'),
    "version": "1.0.0",
    "type": "module", // CORRECTION CRITIQUE: Force le mode ESM pour Node.js et Vite
    "scripts": {
      "dev": "concurrently \"npm run server\" \"npm run client\"",
      "client": "vite",
      "server": "tsx watch server/index.ts", // UTILISATION DE TSX (plus robuste que ts-node pour ESM)
      "build": "tsc && vite build",
      "preview": "vite preview"
    },
    "dependencies": {
      // Backend Core
      "express": "^4.18.2",
      "cors": "^2.8.5",
      "dotenv": "^16.3.1",
      
      // Database Drivers
      "mongoose": "^8.0.3",
      "pg": "^8.11.3",
      "mysql2": "^3.6.5",
      "oracledb": "^6.3.0",
      "@clickhouse/client": "^0.2.6",
      "@elastic/elasticsearch": "^8.11.0",
      "@opensearch-project/opensearch": "^2.5.0",
      "ioredis": "^5.3.2",

      // Frontend Core
      "react": "^18.2.0",
      "react-dom": "^18.2.0",
      "lucide-react": "^0.292.0",
      "framer-motion": "^10.16.4",
      "recharts": "^2.10.3"
    },
    "devDependencies": {
      // Dev Tools
      "concurrently": "^8.2.2",
      "tsx": "^4.7.1", // REMPLACEMENT DE TS-NODE PAR TSX
      // Build Tools
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

  // tsconfig.json (Configuration mise à jour pour ESM/NodeNext)
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

  // vite.config.ts
  zip.file("vite.config.ts", `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
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

  // tailwind.config.js
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

  zip.file("index.html", `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${project.name}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/App.tsx"></script> 
  </body>
</html>
`); 

  // --- TRAITEMENT DES FICHIERS ---
  
  const srcFolder = zip.folder("src");
  const serverFolder = zip.folder("server");

  // Création d'un entry point React standard
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
    // Nettoyage du nom de fichier
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

  // .env exemple
  zip.file(".env", `PORT=3000
# DATABASE CONNECTIONS
DATABASE_URL=postgres://user:pass@localhost:5432/myapp
MONGO_URI=mongodb://localhost:27017/myapp
CLICKHOUSE_URL=http://localhost:8123
ELASTIC_NODE=http://localhost:9200
ORACLE_CONN_STRING=localhost:1521/XEPDB1`);

  // Génération
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
