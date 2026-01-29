
import React, { useEffect, useRef, useState } from 'react';
import { Loader } from 'lucide-react';
import { FileData } from '../types';

interface PreviewProps {
  files: FileData[];
}

const Preview: React.FC<PreviewProps> = ({ files }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isInstalling, setIsInstalling] = useState(false);

  // Helper to extract file content, handling src/ prefix if present
  const getFileContent = (filename: string) => {
      // Priorité aux fichiers dans src/
      return files.find(f => f.name === filename || f.name === `src/${filename}`)?.content || '';
  };

  useEffect(() => {
    // 1. Détection intelligente de l'entrée Frontend
    // On cherche App.tsx, ou main.tsx, ou index.tsx dans src/
    let entryFile = files.find(f => f.name === 'src/App.tsx' || f.name === 'App.tsx');
    if (!entryFile) entryFile = files.find(f => f.name === 'src/main.tsx' || f.name === 'src/index.tsx');

    if (!iframeRef.current || !entryFile) return;

    // 2. Filtrage Strict : On ne garde QUE le frontend
    const frontendFiles = files.filter(f => !f.name.startsWith('server/') && !f.name.includes('package.json'));
    
    // 3. Récupération de tous les styles CSS
    const cssContent = frontendFiles
        .filter(f => f.name.endsWith('.css'))
        .map(f => f.content)
        .join('\n');

    setIsInstalling(true);

    const timer = setTimeout(() => {
      buildAndRun(entryFile!.content, cssContent);
    }, 600);

    const buildAndRun = (clientCode: string, styles: string) => {
        const html = `
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>App Preview</title>
              <script src="https://cdn.tailwindcss.com"></script>
              <script type="importmap">
              {
                "imports": {
                  "react": "https://esm.sh/react@18.2.0",
                  "react-dom/client": "https://esm.sh/react-dom@18.2.0/client",
                  "lucide-react": "https://esm.sh/lucide-react@0.292.0",
                  "recharts": "https://esm.sh/recharts@2.10.3",
                  "framer-motion": "https://esm.sh/framer-motion@10.16.4"
                }
              }
              </script>
              <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
              <style>
                body { background-color: #0f172a; color: white; margin: 0; padding: 0; min-height: 100vh; font-family: sans-serif; }
                #root { height: 100%; width: 100%; display: flex; flex-direction: column; }
                .error-box { position: absolute; top: 0; left: 0; right: 0; padding: 1rem; background: #450a0a; color: #fca5a5; border-bottom: 2px solid #ef4444; font-family: monospace; white-space: pre-wrap; z-index: 50; }
                
                /* Injected Styles from all CSS files */
                ${styles}
              </style>
            </head>
            <body>
              <div id="root"></div>
              
              <script type="module">
                window.process = { env: { NODE_ENV: 'development' } };
                
                // --- ERROR HANDLING ---
                window.showError = (title, msg) => {
                    const errDiv = document.createElement('div');
                    errDiv.className = 'error-box';
                    errDiv.innerHTML = '<strong>' + title + '</strong><br/>' + msg;
                    document.body.appendChild(errDiv);
                };

                // --- MOCK SERVER CALLS (Preview Only) ---
                // Intercept fetch to warn user if they try to call backend without export
                const originalFetch = window.fetch;
                window.fetch = async (url, options) => {
                    if (url.toString().startsWith('/api') && !url.toString().includes('localhost')) {
                         console.warn("[Preview] Backend call intercepted:", url);
                         // On laisse passer, mais souvent ça fera 404 dans la preview statique
                    }
                    return originalFetch(url, options);
                };

                try {
                    // Compile Client Code (Entry Point)
                    const rawClientCode = ${JSON.stringify(clientCode)};
                    
                    // Note: This basic preview compiles the Entry file.
                    // Complex multi-file imports (import X from './components/X') are not fully resolved 
                    // in this lightweight in-browser view without a bundler.
                    // The AI is instructed to keep the Preview entry point self-contained or robust.
                    
                    const compiledClient = Babel.transform(rawClientCode, {
                        filename: 'App.tsx',
                        presets: [['react', { runtime: 'classic' }], 'typescript']
                    }).code;

                    const clientBlob = new Blob([compiledClient], { type: 'text/javascript' });
                    const clientUrl = URL.createObjectURL(clientBlob);

                    import(clientUrl).then((module) => {
                        const App = module.default;
                        if (!App) throw new Error("App.tsx must export a default component.");
                        
                        import('react-dom/client').then(({ createRoot }) => {
                            import('react').then((React) => {
                                class ErrorBoundary extends React.Component {
                                    constructor(props) { super(props); this.state = { hasError: false, error: null }; }
                                    static getDerivedStateFromError(error) { return { hasError: true, error }; }
                                    render() {
                                        if (this.state.hasError) {
                                            return React.createElement('div', { style: { padding: 20, color: '#f87171' } }, 
                                                React.createElement('h3', null, 'Runtime Error'),
                                                React.createElement('div', { style: { marginBottom: 10, fontSize: '0.8em', opacity: 0.8 } }, 
                                                    "Note: Multi-file local imports are limited in Preview. Export project to run full structure."
                                                ),
                                                React.createElement('pre', { style: { overflow: 'auto', background: '#00000030', padding: 10, borderRadius: 4 } }, this.state.error.toString())
                                            );
                                        }
                                        return this.props.children;
                                    }
                                }
                                const root = createRoot(document.getElementById('root'));
                                root.render(React.createElement(ErrorBoundary, null, React.createElement(App)));
                            });
                        });
                    });

                } catch (err) {
                    window.showError('Compilation Error', err.message);
                }
              </script>
            </body>
          </html>
        `;

        const doc = iframeRef.current?.contentDocument;
        if (doc) {
            doc.open();
            doc.write(html);
            doc.close();
        }
        setTimeout(() => setIsInstalling(false), 800);
    };

    return () => clearTimeout(timer);
  }, [files]);

  return (
    <div className="h-full w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700 shadow-xl relative group">
       {isInstalling && (
         <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-slate-300 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 mb-2">
                <Loader className="animate-spin text-blue-500" size={24} />
                <span className="text-sm font-mono font-medium text-blue-400">BUILDING FRONTEND</span>
            </div>
            <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 animate-[loading_1s_ease-in-out_infinite]" style={{width: '50%'}}></div>
            </div>
            <div className="mt-2 text-xs text-slate-500">Ignoring server/ files...</div>
         </div>
       )}
       <iframe
        ref={iframeRef}
        title="Preview"
        sandbox="allow-scripts allow-same-origin allow-modals allow-forms allow-popups"
        className="w-full h-full border-0 block bg-[#0f172a]"
      />
    </div>
  );
};

export default Preview;
