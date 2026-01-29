
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
      return files.find(f => f.name === filename || f.name === `src/${filename}`)?.content || '';
  };

  useEffect(() => {
    // On ne cherche que le point d'entrée Frontend
    const appCode = getFileContent('App.tsx');
    
    if (!iframeRef.current || !appCode) return;

    setIsInstalling(true);

    const timer = setTimeout(() => {
      buildAndRun(appCode);
    }, 600);

    const buildAndRun = (clientCode: string) => {
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
              </style>
            </head>
            <body>
              <div id="root"></div>
              
              <script type="module">
                window.process = { env: { NODE_ENV: 'development' } };
                window.showError = (title, msg) => {
                    const errDiv = document.createElement('div');
                    errDiv.className = 'error-box';
                    errDiv.innerHTML = '<strong>' + title + '</strong><br/>' + msg;
                    document.body.appendChild(errDiv);
                };

                try {
                    // Compile Client Code
                    const rawClientCode = ${JSON.stringify(clientCode)};
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
                                                React.createElement('pre', { style: { overflow: 'auto' } }, this.state.error.toString())
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
                <span className="text-sm font-mono font-medium text-blue-400">BUILDING UI</span>
            </div>
            <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 animate-[loading_1s_ease-in-out_infinite]" style={{width: '50%'}}></div>
            </div>
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
