
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Settings as SettingsIcon, Play, RefreshCw, Cpu, 
  ShieldCheck, ShieldAlert, Save, History, Box, 
  LayoutTemplate, FileText, Send, Zap, Brain, Book, FileCode,
  FolderOpen, Plus, Trash2, Edit2, Maximize2, Minimize2, RotateCcw,
  GitCommit, ChevronDown, Clock, Code as CodeIcon, Terminal as TerminalIcon,
  MessageSquare, PanelLeftClose, PanelLeftOpen, Download, ScanSearch,
  Paperclip, Image as ImageIcon, X
} from 'lucide-react';
import Editor from './components/Editor';
import Preview from './components/Preview';
import Terminal from './components/Terminal';
import Tooltip from './components/Tooltip';
import ConfigModal from './components/ConfigModal';
import ResizableSplitter from './components/ResizableSplitter';
import { 
  FileData, ChatMessage, Settings, Persona, TerminalLog, Project, CodeVersion
} from './types';
import { 
  DEFAULT_FILES, PERSONA_PROMPTS, BASE_SYSTEM_PROMPT 
} from './constants';
import { 
  getModels, generateCode, extractCodeFromResponse, detectSecrets 
} from './services/ollamaService';
import { exportProjectToZip } from './services/exportService';

// Composant Helper pour les icônes de chargement
const Loader = () => <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>;

export default function App() {
  // --- États Globaux ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  
  // --- États de l'éditeur ---
  const [files, setFiles] = useState<FileData[]>(DEFAULT_FILES);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [models, setModels] = useState<string[]>([]);
  const [isApiConnected, setIsApiConnected] = useState<boolean>(false);
  
  // --- Layout & UI ---
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isCodeVisible, setIsCodeVisible] = useState(false); // Code masqué par défaut
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [activeBottomTab, setActiveBottomTab] = useState<'chat' | 'terminal'>('chat'); // Onglets du bas
  const [isPreviewFullScreen, setIsPreviewFullScreen] = useState(false);
  
  const [settings, setSettings] = useState<Settings>({
    provider: 'ollama',
    connection: { baseUrl: 'http://localhost:11434' },
    model: '',
    persona: Persona.CODER,
    thinkingMode: false,
    privacyMode: true,
    autoTest: false
  });

  const [previewKey, setPreviewKey] = useState(0); 
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [logs, setLogs] = useState<TerminalLog[]>([]);
  
  // --- Gestion des Images (Vision) ---
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Gestion des Versions ---
  const [versions, setVersions] = useState<CodeVersion[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);

  // --- Initialisation ---
  useEffect(() => {
    const savedProjects = localStorage.getItem('vibe_projects');
    if (savedProjects) {
      try {
        const parsed = JSON.parse(savedProjects);
        setProjects(parsed);
        if (parsed.length > 0) {
          const firstProject = parsed[0];
          setCurrentProjectId(firstProject.id);
          setFiles(firstProject.files);
        } else { createNewProject(); }
      } catch (e) { createNewProject(); }
    } else { createNewProject(); }

    const savedSettings = localStorage.getItem('vibe_settings');
    let initialSettings = settings;
    if (savedSettings) {
        try {
            const parsedSettings = JSON.parse(savedSettings);
            setSettings(parsedSettings);
            initialSettings = parsedSettings;
        } catch(e) {}
    }
    initConnection(initialSettings);
    
    // Auto switch to terminal tab on error
    const handleLogsChange = () => {
         if (logs.length > 0 && logs[logs.length-1].type === 'error') {
             setActiveBottomTab('terminal');
         }
    };
    handleLogsChange();

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
      // Auto-switch tab si erreur récente (optionnel, UX)
      if (logs.length > 0 && logs[logs.length-1].type === 'error') {
          // setActiveBottomTab('terminal'); // Peut être intrusif, laissé commenté
      }
  }, [logs]);

  const handleClickOutside = (event: MouseEvent) => {
        if (historyRef.current && !historyRef.current.contains(event.target as Node)) {
            setIsHistoryOpen(false);
        }
  };

  useEffect(() => localStorage.setItem('vibe_settings', JSON.stringify(settings)), [settings]);
  useEffect(() => { if (projects.length > 0) localStorage.setItem('vibe_projects', JSON.stringify(projects)); }, [projects]);

  const initConnection = async (config: Settings) => {
      addLog('info', `Connecting to ${config.provider}...`);
      try {
        const availableModels = await getModels(config);
        setModels(availableModels);
        if (availableModels.length > 0 && (!config.model || !availableModels.includes(config.model))) {
             setSettings(s => ({ ...s, model: availableModels[0] }));
        }
        setIsApiConnected(true);
        addLog('success', 'Connected.');
      } catch (e: any) {
          setIsApiConnected(false);
          addLog('error', `Connection error: ${e.message}`);
      }
  };

  const createNewProject = () => {
    const initialCode = DEFAULT_FILES[0].content;
    const newProject: Project = {
      id: Date.now().toString(),
      name: `Project ${new Date().toLocaleTimeString().slice(0, 5)}`,
      lastModified: Date.now(),
      files: DEFAULT_FILES
    };
    setProjects(prev => [newProject, ...prev]);
    setCurrentProjectId(newProject.id);
    setFiles(newProject.files);
    setActiveFileIndex(0);
    setChatHistory([]);
    setLogs([]);
    setVersions([{ number: 1, description: "Init", code: initialCode, timestamp: Date.now() }]);
    setPreviewKey(k => k + 1);
  };

  const loadProject = (project: Project) => {
    if (currentProjectId === project.id) return;
    setCurrentProjectId(project.id);
    setFiles(project.files);
    setActiveFileIndex(0);
    const currentCode = project.files[0].content;
    setVersions([{ number: 1, description: "Loaded", code: currentCode, timestamp: Date.now() }]);
    setChatHistory([]); 
    setLogs([]);
    setPreviewKey(prev => prev + 1);
  };

  const deleteProject = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    const newProjects = projects.filter(p => p.id !== projectId);
    setProjects(newProjects);
    if (currentProjectId === projectId) {
      if (newProjects.length > 0) {
        const nextp = newProjects[0];
        setCurrentProjectId(nextp.id);
        setFiles(nextp.files);
        setPreviewKey(k => k + 1);
      } else { createNewProject(); }
    }
  };

  const updateFilesState = (newFiles: FileData[]) => {
      setFiles(newFiles);
      if (currentProjectId) {
          setProjects(prev => prev.map(p => p.id === currentProjectId ? { ...p, files: newFiles, lastModified: Date.now() } : p));
      }
  };

  const addLog = (type: TerminalLog['type'], message: string) => {
    setLogs(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), type, message, timestamp: new Date().toLocaleTimeString() }]);
  };

  const getActiveFileContent = () => files[activeFileIndex].content;

  const updateActiveFile = (newContent: string) => {
    const newFiles = [...files];
    newFiles[activeFileIndex] = { ...newFiles[activeFileIndex], content: newContent };
    updateFilesState(newFiles);
  };

  const upsertFile = (name: string, content: string, language: string) => {
    const existingIdx = files.findIndex(f => f.name === name);
    let newFiles;
    if (existingIdx >= 0) {
        newFiles = [...files];
        newFiles[existingIdx] = { ...newFiles[existingIdx], content, language };
    } else {
        newFiles = [...files, { name, content, language }];
    }
    updateFilesState(newFiles);
  };

  const createVersion = (code: string, description: string) => {
      const nextNum = versions.length > 0 ? versions[0].number + 1 : 1;
      const newVersion: CodeVersion = {
          number: nextNum,
          description: description.length > 40 ? description.substring(0, 40) + '...' : description,
          code: code,
          timestamp: Date.now()
      };
      setVersions(prev => [newVersion, ...prev]);
  };

  const restoreVersion = (version: CodeVersion) => {
      updateActiveFile(version.code);
      setPreviewKey(prev => prev + 1);
      addLog('warning', `Rollback v${version.number}`);
      setIsHistoryOpen(false);
  };

  const handleRefreshPreview = () => {
    setPreviewKey(prev => prev + 1);
    addLog('info', 'Reload preview...');
  };

  const handleExport = async () => {
    if (!currentProjectId) return;
    const project = projects.find(p => p.id === currentProjectId);
    if (!project) return;

    addLog('info', 'Preparing ZIP...');
    try {
        await exportProjectToZip(project);
        addLog('success', 'Project exported (ZIP).');
    } catch (e: any) {
        addLog('error', 'Export error: ' + e.message);
    }
  };

  // --- Gestion des Images ---
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setAttachedImage(reader.result as string);
              // Reset l'input pour permettre de resélectionner le même fichier si besoin
              if (fileInputRef.current) fileInputRef.current.value = '';
          };
          reader.readAsDataURL(file);
      }
  };

  const clearAttachedImage = () => setAttachedImage(null);

  // --- Documentation & Analysis ---
  const handleGenerateReadme = async () => {
    if (!settings.model) return;
    setIsGenerating(true);
    addLog('info', 'Generating README...');
    const appCode = files.find(f => f.name === 'App.tsx')?.content || '';
    const docPrompt = `Generate a technical README.md for this React code:\n\`\`\`tsx\n${appCode}\n\`\`\``;
    try {
        const response = await generateCode(settings.model, docPrompt, "Expert Doc.", settings);
        const readmeContent = extractCodeFromResponse(response) || response;
        upsertFile('README.md', readmeContent, 'markdown');
        addLog('success', 'README.md generated.');
    } catch (e) { addLog('error', "README error."); } finally { setIsGenerating(false); }
  };

  const handleInjectJSDoc = async () => {
      if (!settings.model) return;
      setIsGenerating(true);
      addLog('info', "Injecting JSDoc...");
      const currentCode = getActiveFileContent();
      const jsDocPrompt = `Add JSDoc comments to the following code without changing logic:\n\`\`\`tsx\n${currentCode}\n\`\`\``;
      try {
          const response = await generateCode(settings.model, jsDocPrompt, "Expert Clean Code.", settings);
          const newCode = extractCodeFromResponse(response);
          if (newCode && !detectSecrets(newCode)) {
              createVersion(currentCode, "Pre-JSDoc"); 
              updateActiveFile(newCode);
              createVersion(newCode, "JSDoc");
              addLog('success', 'JSDoc added.');
          }
      } catch (e) { addLog('error', "JSDoc error."); } finally { setIsGenerating(false); }
  };

  const handleGenerateSpecs = async () => {
    if (!settings.model) { setIsConfigOpen(true); return; }
    setIsGenerating(true);
    addLog('info', 'Analyzing codebase for SPECS...');
    
    // Concaténer tout le code pour analyse
    const codebaseContext = files.map(f => `// File: ${f.name}\n${f.content}`).join('\n\n');
    
    const specPrompt = `
      Analyze the provided codebase and generate a functional specification document in Markdown format (SPECS.md).
      You must strictly follow this structure and language (English):

      # Application Specification

      ## Global Objective
      [One sentence describing exactly what this application does]

      ## Data Architecture
      [Analyze the main interfaces, types, and how data flows between components]

      ## Logic Flow Analysis
      * **External Connections:** [How are APIs, props, or external services handled?]
      * **Data Transformation:** [Key calculations, state mutations, aggregations]

      ## User Experience (UX)
      [Describe the main user interactions: Drag & drop, forms, clicks, feedback]

      ## Tech Stack
      [List libraries used and their specific role in this code]

      ## Points of Attention
      [Identify potential limits: Security, Performance, Scalability based on the code]

      ---
      Codebase:
      ${codebaseContext}
    `;

    try {
        const response = await generateCode(settings.model, specPrompt, "You are a Senior Technical Writer and Code Analyst.", settings);
        // On prend le contenu complet, ou le bloc markdown si l'IA l'encapsule
        const content = extractCodeFromResponse(response) || response;
        
        upsertFile('SPECS.md', content, 'markdown');
        addLog('success', 'SPECS.md generated.');
        setIsCodeVisible(true); // Show file list
    } catch (e: any) {
        addLog('error', 'Spec gen failed: ' + e.message);
    } finally {
        setIsGenerating(false);
    }
  };

  const handleGenerateSecurityAudit = async () => {
    if (!settings.model) { setIsConfigOpen(true); return; }
    setIsGenerating(true);
    addLog('info', 'Running Security/Risk Analysis...');
    
    const codebaseContext = files.map(f => `// File: ${f.name}\n${f.content}`).join('\n\n');
    
    const securityPrompt = `
      Analyze the provided codebase for security vulnerabilities, technical risks, and bad practices.
      Generate a detailed SECURITY.md report in English.

      Structure:
      1. **Executive Summary**: Brief overview of the security posture.
      2. **Risk Analysis**:
         - Cyber Security Risks (XSS, Injection, Secrets, CSRF, etc.)
         - Data Leaks & Privacy Risks
         - Component/Dependency Risks
      3. **Code Quality & Reliability**:
         - Potential Crashes / Unhandled Errors
         - Performance Bottlenecks
         - React Anti-patterns
      4. **Recommendations**: Concrete steps to fix the issues.
      5. **Risk Score**: 0 (Critical) to 100 (Safe).

      Codebase:
      ${codebaseContext}
    `;

    try {
        const response = await generateCode(settings.model, securityPrompt, "You are a Cyber Security Expert and Senior React Auditor.", settings);
        const content = extractCodeFromResponse(response) || response;
        
        upsertFile('SECURITY.md', content, 'markdown');
        addLog('success', 'SECURITY.md generated.');
        setIsCodeVisible(true); // Show file list
    } catch (e: any) {
        addLog('error', 'Audit failed: ' + e.message);
    } finally {
        setIsGenerating(false);
    }
  };

  // --- IA Chat ---
  const handleGenerate = async () => {
    if ((!prompt.trim() && !attachedImage) || !settings.model) {
        if(!settings.model) setIsConfigOpen(true);
        return;
    }
    setIsGenerating(true);
    const userPromptText = prompt;
    
    // Ajout du message utilisateur à l'historique
    const userMsg: ChatMessage = { 
        role: 'user', 
        content: userPromptText, 
        image: attachedImage || undefined,
        timestamp: Date.now() 
    };
    setChatHistory(prev => [...prev, userMsg]);
    
    setPrompt('');
    setAttachedImage(null); // Reset image after send

    const currentCode = getActiveFileContent();
    const assistantRules = files.find(f => f.name === '.assistantrules')?.content || '';
    
    let systemPrompt = `${BASE_SYSTEM_PROMPT}\n\nContext:\n${assistantRules}\nPersona: ${settings.persona}\n${PERSONA_PROMPTS[settings.persona]}\n`;
    systemPrompt += `\nITERATION MODE: Modify the current code based on the request. RETURN THE FULL CODE.`;
    if (settings.thinkingMode) systemPrompt += "\nUse Chain of Thought.\n";

    let fullPrompt = `Code (App.tsx):\n\`\`\`tsx\n${currentCode}\n\`\`\`\n\nRequest : ${userMsg.content}`;
    if (userMsg.image) {
        fullPrompt += "\n[IMAGE ATTACHED] Use the attached image as visual context/reference for the changes.";
    }

    addLog('info', `Generating v${versions.length + 1}...`);

    try {
      // Envoi de l'image (si présente) sous forme de tableau
      const imagesToSend = userMsg.image ? [userMsg.image] : [];
      
      const responseText = await generateCode(
          settings.model, 
          fullPrompt, 
          systemPrompt, 
          settings, 
          imagesToSend
      );

      let thinkingContent = '';
      if (settings.thinkingMode) {
          const codeBlockIndex = responseText.indexOf('```');
          if (codeBlockIndex > 0) thinkingContent = responseText.substring(0, codeBlockIndex);
      }
      
      const extractedCode = extractCodeFromResponse(responseText);

      // Extract the summary (everything EXCEPT the code block)
      let summaryText = responseText.replace(/```(?:tsx|typescript|javascript|jsx|markdown|md)?\s*([\s\S]*?)\s*```/g, '').trim();
      
      // Clean up thinking block from summary if present in the text part
      if (settings.thinkingMode && thinkingContent) {
          summaryText = summaryText.replace(thinkingContent, '').trim();
      }

      if (!summaryText) summaryText = "Code updated.";

      if (extractedCode) {
        if (detectSecrets(extractedCode)) {
           addLog('error', 'Security : Secrets detected.');
           setChatHistory(prev => [...prev, { role: 'assistant', content: "Code blocked (secrets detected).", thinking: thinkingContent, timestamp: Date.now() }]);
        } else {
            updateActiveFile(extractedCode);
            createVersion(extractedCode, userPromptText);
            addLog('success', `v${versions.length + 1} applied.`);
            if (settings.autoTest) setTimeout(() => addLog('success', 'Tests OK'), 1500);
            setChatHistory(prev => [...prev, { role: 'assistant', content: summaryText, thinking: thinkingContent, timestamp: Date.now() }]);
        }
      } else {
          setChatHistory(prev => [...prev, { role: 'assistant', content: responseText, thinking: thinkingContent, timestamp: Date.now() }]);
      }
    } catch (error: any) {
      addLog('error', `Error: ${error.message}`);
      setChatHistory(prev => [...prev, { role: 'assistant', content: `Error: ${error.message}`, timestamp: Date.now() }]);
    } finally { setIsGenerating(false); }
  };

  const handleSaveConfig = (newSettings: Settings) => { setSettings(newSettings); initConnection(newSettings); };

  // --- Composants Internes de Layout ---
  // TRANSFORMATION EN VARIABLES POUR ÉVITER LE REMOUNT
  
  const sidebarContent = (
    <div className="h-full bg-slate-950 flex flex-col border-r border-slate-800">
        {/* Header Sidebar */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                    <Zap className="text-white" size={18} />
                </div>
                <h1 className="font-bold text-lg tracking-tight text-white">Vibe</h1>
            </div>
            <div className="flex gap-1">
                <Tooltip content="Export ZIP">
                    <button onClick={handleExport} className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors">
                        <Download size={18} />
                    </button>
                </Tooltip>
                <Tooltip content="New Project">
                    <button onClick={createNewProject} className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors">
                        <Plus size={18} />
                    </button>
                </Tooltip>
            </div>
        </div>

        {/* File Explorer */}
        <div className="flex-1 overflow-y-auto p-2">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-2 mt-2">Files</div>
            {files.map((file, idx) => (
                <button
                    key={file.name}
                    onClick={() => { setActiveFileIndex(idx); setIsCodeVisible(true); }} // Auto-open code
                    className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 mb-1 text-xs font-medium transition-colors ${
                        activeFileIndex === idx ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' : 'hover:bg-slate-800 text-slate-400'
                    }`}
                >
                   {file.name === '.assistantrules' ? <Brain size={14} /> : 
                    file.name.endsWith('.md') ? <Book size={14} /> : <FileText size={14} />}
                   {file.name}
                </button>
            ))}

            <div className="mt-6 border-t border-slate-800 pt-4">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">Projects</div>
                {projects.map((p) => (
                    <div 
                        key={p.id}
                        onClick={() => loadProject(p)}
                        className={`group flex items-center justify-between w-full text-left px-3 py-2 rounded-md mb-1 text-xs cursor-pointer transition-colors ${
                            currentProjectId === p.id ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-800/50'
                        }`}
                    >
                        <div className="flex items-center gap-2 truncate">
                            <FolderOpen size={14} />
                            <span className="truncate max-w-[100px]">{p.name}</span>
                        </div>
                        {currentProjectId !== p.id && (
                             <button onClick={(e) => deleteProject(e, p.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400">
                                <Trash2 size={12} />
                             </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
        
        {/* Footer Sidebar */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/50">
             <button onClick={() => setIsConfigOpen(true)} className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-1.5 rounded text-xs transition-colors border border-slate-700">
                <SettingsIcon size={12} /> {settings.model || "Configuration"}
            </button>
        </div>
    </div>
  );

  const codePanelContent = (
      <div className="h-full flex flex-col bg-[#1e1e1e]">
         <div className="h-9 flex items-center justify-between px-4 bg-[#252526] border-b border-black">
             <span className="text-xs font-medium text-slate-400 flex items-center gap-2">
                 <FileCode size={14} /> {files[activeFileIndex].name}
             </span>
             <button onClick={() => setIsCodeVisible(false)} className="text-slate-500 hover:text-white" title="Hide code">
                 <PanelLeftClose size={14} />
             </button>
         </div>
         <div className="flex-1 overflow-hidden relative">
            <Editor 
                code={files[activeFileIndex].content} 
                language={files[activeFileIndex].language}
                onChange={(val) => val && updateActiveFile(val)}
            />
         </div>
      </div>
  );

  const previewPanelContent = (
      <div className="h-full flex flex-col bg-slate-900 relative">
          
          {/* Header Preview (Overlay) */}
          <div className="absolute top-3 left-1/2 transform -translate-x-1/2 flex items-center gap-2 z-10">
            <div className="bg-slate-900/90 backdrop-blur-md text-xs px-3 py-1.5 rounded-full border border-slate-700 text-slate-300 flex items-center gap-3 shadow-xl">
                    <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Preview
                    </div>
                    <div className="h-3 w-[1px] bg-slate-600"></div>
                    <div className="flex items-center gap-1">
                    <Tooltip content="Reload">
                        <button onClick={handleRefreshPreview} className="p-1 hover:text-white hover:bg-slate-700 rounded-full transition-colors"><RotateCcw size={12} /></button>
                    </Tooltip>
                    <Tooltip content="Fullscreen">
                        <button onClick={() => setIsPreviewFullScreen(!isPreviewFullScreen)} className="p-1 hover:text-white hover:bg-slate-700 rounded-full transition-colors">
                            {isPreviewFullScreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                        </button>
                    </Tooltip>
                    </div>
            </div>
          </div>
          <div className="flex-1 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-slate-950">
             <Preview key={previewKey} code={files.find(f => f.name === 'App.tsx')?.content || ''} />
          </div>
      </div>
  );

  const bottomPanelContent = (
      <div className="h-full flex flex-col bg-slate-900 border-t border-slate-800">
          {/* Tabs */}
          <div className="flex items-center px-2 bg-[#252526] border-b border-black h-9">
              <button 
                onClick={() => setActiveBottomTab('chat')}
                className={`flex items-center gap-2 px-4 h-full text-xs font-medium border-r border-black/20 transition-colors ${activeBottomTab === 'chat' ? 'bg-[#1e1e1e] text-blue-400' : 'text-slate-500 hover:text-slate-300 hover:bg-[#2a2a2c]'}`}
              >
                  <MessageSquare size={14} /> Assistant (Prompt)
              </button>
              <button 
                onClick={() => setActiveBottomTab('terminal')}
                className={`flex items-center gap-2 px-4 h-full text-xs font-medium border-r border-black/20 transition-colors ${activeBottomTab === 'terminal' ? 'bg-[#1e1e1e] text-yellow-400' : 'text-slate-500 hover:text-slate-300 hover:bg-[#2a2a2c]'}`}
              >
                  <TerminalIcon size={14} /> Console / Logs
                  {logs.some(l => l.type === 'error') && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
              </button>
              <div className="flex-1"></div>
              {/* Toolbar Actions */}
              <div className="flex items-center gap-2 pr-2">
                 <Tooltip content="History">
                    <button onClick={() => setIsHistoryOpen(!isHistoryOpen)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-700">
                        <GitCommit size={14} /> v{versions.length > 0 ? versions[0].number : 1}
                    </button>
                 </Tooltip>
                 {isHistoryOpen && (
                     <div ref={historyRef} className="absolute bottom-10 right-4 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 max-h-60 overflow-y-auto">
                        {versions.map((v) => (
                            <button key={v.number} onClick={() => restoreVersion(v)} className="w-full text-left p-2 hover:bg-slate-700 border-b border-slate-700/50 text-xs">
                                <div className="font-bold text-blue-400">v{v.number}</div>
                                <div className="truncate text-slate-400">{v.description}</div>
                            </button>
                        ))}
                     </div>
                 )}
              </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden relative bg-[#1e1e1e]">
              {activeBottomTab === 'chat' && (
                  <div className="h-full flex flex-col">
                      {/* Chat History */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                          {chatHistory.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-slate-600 opacity-60">
                                <Zap size={40} className="mb-2" />
                                <p className="text-sm">Vibe Coding Ready.</p>
                                <p className="text-xs">"Add a blue button..."</p>
                            </div>
                          )}
                          {chatHistory.map((msg, idx) => (
                            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[90%] rounded-lg p-3 text-sm font-sans ${msg.role === 'user' ? 'bg-blue-600/20 border border-blue-500/30 text-blue-100' : 'bg-slate-800 border border-slate-700 text-slate-300'}`}>
                                    {/* Affichage de l'image si présente */}
                                    {msg.image && (
                                        <div className="mb-2 rounded overflow-hidden border border-white/10 max-w-[200px]">
                                            <img src={msg.image} alt="User attachment" className="w-full h-auto" />
                                        </div>
                                    )}
                                    {msg.thinking && <div className="mb-2 pb-2 border-b border-white/10 text-xs text-slate-500 italic font-mono">{msg.thinking}</div>}
                                    <div className="whitespace-pre-wrap">{msg.content}</div>
                                </div>
                            </div>
                          ))}
                          {isGenerating && <div className="text-xs text-blue-400 flex items-center gap-2 px-2"><Loader /> Generating...</div>}
                      </div>
                      
                      {/* Input Area */}
                      <div className="p-3 bg-[#252526] border-t border-black">
                          {/* Prévisualisation de l'image attachée */}
                          {attachedImage && (
                              <div className="mb-2 flex items-center">
                                  <div className="relative group">
                                      <div className="w-16 h-16 rounded-md overflow-hidden border border-slate-600 bg-slate-800">
                                          <img src={attachedImage} alt="Preview" className="w-full h-full object-cover" />
                                      </div>
                                      <button 
                                        onClick={clearAttachedImage}
                                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow-sm hover:bg-red-600"
                                      >
                                          <X size={10} />
                                      </button>
                                  </div>
                              </div>
                          )}

                          <div className="relative flex items-center gap-2">
                             {/* Bouton Upload Image */}
                             <div className="relative">
                                <input 
                                    ref={fileInputRef}
                                    type="file" 
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                    className="hidden"
                                    id="image-upload"
                                />
                                <Tooltip content="Attach Image">
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-2 text-slate-400 hover:text-white bg-[#3c3c3c] hover:bg-slate-600 rounded transition-colors"
                                    >
                                        <Paperclip size={16} />
                                    </button>
                                </Tooltip>
                             </div>

                            <input
                                type="text"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !isGenerating && handleGenerate()}
                                placeholder="Instructions for AI..."
                                className="w-full bg-[#3c3c3c] text-white text-sm rounded-md pl-3 pr-10 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-500"
                                disabled={isGenerating}
                            />
                            <button onClick={handleGenerate} disabled={isGenerating || (!prompt.trim() && !attachedImage)} className="absolute right-1.5 p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-50">
                                <Send size={14} />
                            </button>
                          </div>
                      </div>
                  </div>
              )}
              
              {activeBottomTab === 'terminal' && (
                  <Terminal logs={logs} onClear={() => setLogs([])} onFixError={() => { setPrompt("Fix terminal errors"); setActiveBottomTab('chat'); handleGenerate(); }} />
              )}
          </div>
      </div>
  );

  return (
    <div className="flex h-screen w-full bg-background text-slate-200 overflow-hidden font-sans">
      <ConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} settings={settings} onSave={handleSaveConfig} />

      {/* 1. Sidebar Resizable */}
      <ResizableSplitter
        isVertical={false}
        initialSize={15}
        minSize={10}
        maxSize={25}
        isFirstHidden={!isSidebarVisible}
        firstChild={sidebarContent}
        secondChild={
            <div className="flex flex-col h-full w-full">
                {/* Header (Toolbar) */}
                <div className="h-12 bg-[#2d2d2d] border-b border-black flex items-center px-4 justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsSidebarVisible(!isSidebarVisible)} className="text-slate-400 hover:text-white">
                           {isSidebarVisible ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
                        </button>
                        <div className="h-4 w-[1px] bg-slate-600"></div>
                        <button 
                            onClick={() => setIsCodeVisible(!isCodeVisible)} 
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${isCodeVisible ? 'bg-blue-600/20 text-blue-400 border-blue-500/50' : 'text-slate-400 border-transparent hover:bg-slate-700'}`}
                        >
                            <CodeIcon size={14} /> Code
                        </button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                         {/* Actions Rapides */}
                         <div className="flex items-center bg-slate-800 rounded-md p-0.5 border border-slate-700 mr-2">
                            <Tooltip content="Readme">
                                <button onClick={handleGenerateReadme} disabled={isGenerating} className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-700"><Book size={16} /></button>
                            </Tooltip>
                            <Tooltip content="Specs">
                                <button onClick={handleGenerateSpecs} disabled={isGenerating} className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-700"><ScanSearch size={16} /></button>
                            </Tooltip>
                            <Tooltip content="Security Audit">
                                <button onClick={handleGenerateSecurityAudit} disabled={isGenerating} className="p-1.5 text-slate-400 hover:text-red-400 rounded hover:bg-slate-700"><ShieldAlert size={16} /></button>
                            </Tooltip>
                            <Tooltip content="JSDoc">
                                <button onClick={handleInjectJSDoc} disabled={isGenerating} className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-700"><FileCode size={16} /></button>
                            </Tooltip>
                         </div>

                         <div className="bg-slate-800 px-3 py-1 rounded text-xs text-slate-400 border border-slate-700">
                             {settings.model || "No Model"}
                         </div>
                    </div>
                </div>

                {/* 2. Main Content Splitter (Code vs Preview) */}
                <div className="flex-1 overflow-hidden relative">
                    <ResizableSplitter
                        isVertical={false}
                        initialSize={40}
                        minSize={20}
                        maxSize={60}
                        isFirstHidden={!isCodeVisible}
                        firstChild={codePanelContent}
                        secondChild={
                            // 3. Right Pane Splitter (Preview vs Bottom Tabs)
                            <div className={`h-full w-full ${isPreviewFullScreen ? 'fixed inset-0 z-50 bg-slate-900' : ''}`}>
                                 <ResizableSplitter
                                    isVertical={true}
                                    initialSize={70}
                                    minSize={30}
                                    maxSize={90}
                                    firstChild={previewPanelContent}
                                    secondChild={!isPreviewFullScreen ? bottomPanelContent : null}
                                    isSecondHidden={isPreviewFullScreen}
                                 />
                            </div>
                        }
                    />
                </div>
            </div>
        }
      />
    </div>
  );
}
