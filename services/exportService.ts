import JSZip from 'jszip';
import { Project, FileData } from '../types';

export const exportProjectToZip = async (project: Project) => {
  const zip = new JSZip();

  // 1. Fichiers de configuration (Scaffolding Vite + React + Tailwind)
  
  // package.json
  const packageJson = {
    "name": project.name.toLowerCase().replace(/\s+/g, '-'),
    "private": true,
    "version": "0.0.1",
    "type": "module",
    "scripts": {
      "dev": "vite",
      "build": "tsc && vite build",
      "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
      "preview": "vite preview"
    },
    "dependencies": {
      "lucide-react": "^0.292.0",
      "react": "^18.2.0",
      "react-dom": "^18.2.0"
    },
    "devDependencies": {
      "@types/react": "^18.2.43",
      "@types/react-dom": "^18.2.17",
      "@vitejs/plugin-react": "^4.2.1",
      "autoprefixer": "^10.4.16",
      "postcss": "^8.4.32",
      "tailwindcss": "^3.4.0",
      "typescript": "^5.2.2",
      "vite": "^5.0.8"
    }
  };
  zip.file("package.json", JSON.stringify(packageJson, null, 2));

  // tsconfig.json
  const tsConfig = {
    "compilerOptions": {
      "target": "ES2020",
      "useDefineForClassFields": true,
      "lib": ["ES2020", "DOM", "DOM.Iterable"],
      "module": "ESNext",
      "skipLibCheck": true,
      "moduleResolution": "bundler",
      "allowImportingTsExtensions": true,
      "resolveJsonModule": true,
      "isolatedModules": true,
      "noEmit": true,
      "jsx": "react-jsx",
      "strict": true,
      "noUnusedLocals": true,
      "noUnusedParameters": true,
      "noFallthroughCasesInSwitch": true
    },
    "include": ["src"],
    "references": [{ "path": "./tsconfig.node.json" }]
  };
  zip.file("tsconfig.json", JSON.stringify(tsConfig, null, 2));

  // tsconfig.node.json
  zip.file("tsconfig.node.json", JSON.stringify({
    "compilerOptions": {
      "composite": true,
      "skipLibCheck": true,
      "module": "ESNext",
      "moduleResolution": "bundler",
      "allowSyntheticDefaultImports": true
    },
    "include": ["vite.config.ts"]
  }, null, 2));

  // vite.config.ts
  zip.file("vite.config.ts", `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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

  // postcss.config.js
  zip.file("postcss.config.js", `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`);

  // index.html
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

  // 2. Dossier SRC
  const src = zip.folder("src");
  if (!src) throw new Error("Impossible de créer le dossier src");

  // main.tsx (Entry point)
  src.file("main.tsx", `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`);

  // index.css (Tailwind directives)
  src.file("index.css", `@tailwind base;
@tailwind components;
@tailwind utilities;
`);

  // 3. Fichiers du projet utilisateur
  project.files.forEach((file: FileData) => {
    // On ignore les fichiers systèmes comme .assistantrules pour le build final
    // ou on les met à la racine si c'est des fichiers de config/doc
    if (file.name === 'App.tsx') {
        src.file(file.name, file.content);
    } else if (file.name.endsWith('.tsx') || file.name.endsWith('.ts') || file.name.endsWith('.css')) {
        src.file(file.name, file.content);
    } else {
        // Markdown, JSON, etc à la racine
        zip.file(file.name, file.content);
    }
  });

  // 4. Génération et téléchargement
  const blob = await zip.generateAsync({ type: "blob" });
  
  // Création du lien de téléchargement
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.name.replace(/\s+/g, '_')}.zip`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};