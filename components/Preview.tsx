import React, { useEffect, useRef, useState } from 'react';
import { Loader } from 'lucide-react';

interface PreviewProps {
  code: string;
}

const Preview: React.FC<PreviewProps> = ({ code }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);

  useEffect(() => {
    if (!iframeRef.current || !code) return;

    // Simulation de la phase de "Build & Install" du serveur
    setIsInstalling(true);
    setBuildError(null);

    // Petit délai pour simuler le temps de traitement serveur
    const timer = setTimeout(() => {
      buildAndRun();
    }, 600);

    const buildAndRun = () => {
        const html = `
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>App Preview</title>
              
              <!-- 1. Tailwind CSS (Style System) -->
              <script src="https://cdn.tailwindcss.com"></script>
              
              <!-- 2. Import Map : C'est notre "package.json" virtuel. 
                   Il dit au navigateur où trouver les vraies dépendances quand il voit un "import". -->
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

              <!-- 3. Babel pour la compilation TSX -> JS (Build Step) -->
              <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

              <style>
                body { background-color: #0f172a; color: white; margin: 0; padding: 0; min-height: 100vh; font-family: sans-serif; }
                #root { height: 100%; width: 100%; display: flex; flex-direction: column; }
                
                /* Error UI */
                .error-box { position: absolute; top: 0; left: 0; right: 0; padding: 1rem; background: #450a0a; color: #fca5a5; border-bottom: 2px solid #ef4444; font-family: monospace; white-space: pre-wrap; z-index: 50; }
              </style>
            </head>
            <body>
              <div id="root"></div>
              
              <script type="module">
                // Fonction pour afficher les erreurs fatales
                window.showError = (title, msg) => {
                    const errDiv = document.createElement('div');
                    errDiv.className = 'error-box';
                    errDiv.innerHTML = '<strong>' + title + '</strong><br/>' + msg;
                    document.body.appendChild(errDiv);
                };

                try {
                    // --- PHASE DE COMPILATION (Server Side Build Simulation) ---
                    const rawCode = ${JSON.stringify(code)};
                    
                    // On utilise Babel pour transformer le JSX/TSX en JavaScript standard (ES Modules)
                    // Contrairement à la version précédente, on garde les 'import' intacts !
                    const compiled = Babel.transform(rawCode, {
                        filename: 'App.tsx',
                        presets: [
                            ['react', { runtime: 'classic' }], 
                            'typescript'
                        ]
                    }).code;

                    // --- PHASE DE DEPLOIEMENT (Virtual File System) ---
                    // On crée un fichier virtuel (Blob) qui contient le code compilé
                    const blob = new Blob([compiled], { type: 'text/javascript' });
                    const blobUrl = URL.createObjectURL(blob);

                    // --- PHASE D'EXECUTION (Client Side Hydration) ---
                    // On importe dynamiquement ce fichier virtuel
                    import(blobUrl)
                        .then((module) => {
                            const App = module.default;
                            
                            if (!App) {
                                throw new Error("The module does not export a 'default' component.");
                            }

                            // Montage React 18
                            import('react-dom/client').then(({ createRoot }) => {
                                import('react').then((React) => {
                                     // Error Boundary minimaliste
                                    class ErrorBoundary extends React.Component {
                                        constructor(props) { super(props); this.state = { hasError: false, error: null }; }
                                        static getDerivedStateFromError(error) { return { hasError: true, error }; }
                                        render() {
                                            if (this.state.hasError) {
                                                return React.createElement('div', { style: { padding: 20, color: '#f87171' } }, 
                                                    React.createElement('h3', null, 'Runtime Error'),
                                                    React.createElement('pre', { style: { overflow: 'auto' } }, this.state.error.toString())
                                                );
                                            }
                                            return this.props.children;
                                        }
                                    }

                                    const root = createRoot(document.getElementById('root'));
                                    root.render(React.createElement(ErrorBoundary, null, React.createElement(App)));
                                    
                                    // Notifier le parent que tout est OK
                                    window.parent.postMessage({ type: 'PREVIEW_READY' }, '*');
                                });
                            });
                        })
                        .catch(err => {
                            console.error(err);
                            window.showError('Module / Import Error', err.message);
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
        
        // Arrêt de l'animation de chargement après un temps minimum pour l'UX
        setTimeout(() => setIsInstalling(false), 800);
    };

    return () => clearTimeout(timer);
  }, [code]);

  return (
    <div className="h-full w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700 shadow-xl relative group">
       
       {/* Overlay de chargement "Mode Serveur" */}
       {isInstalling && (
         <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-slate-300 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 mb-2">
                <Loader className="animate-spin text-blue-500" size={24} />
                <span className="text-sm font-mono font-medium text-blue-400">SERVER::INSTALLING_MODULES</span>
            </div>
            <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 animate-[loading_1s_ease-in-out_infinite]" style={{width: '50%'}}></div>
            </div>
            <div className="mt-2 text-xs text-slate-500 font-mono">
                Resolving dependencies...
            </div>
         </div>
       )}

       <iframe
        ref={iframeRef}
        title="Preview"
        // Sandbox strict mais permettant les scripts et l'accès réseau pour les modules ESM
        sandbox="allow-scripts allow-same-origin allow-modals allow-forms allow-popups"
        className="w-full h-full border-0 block bg-[#0f172a]"
      />
    </div>
  );
};

export default Preview;