
import React, { useState, useEffect } from 'react';
import { Settings, AiProvider } from '../types';
import { X, Server, Key, Globe, CheckCircle, AlertCircle, Save, RefreshCw, Github, GitBranch } from 'lucide-react';
import { getModels } from '../services/ollamaService';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSave: (newSettings: Settings) => void;
}

const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'github'>('ai');
  const [localSettings, setLocalSettings] = useState<Settings>(settings);
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  useEffect(() => {
    setLocalSettings(settings);
    setTestStatus('idle');
    setTestMessage('');
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestStatus('idle');
    setTestMessage('');
    
    try {
      const models = await getModels(localSettings);
      setAvailableModels(models);
      setTestStatus('success');
      setTestMessage(`${models.length} models found.`);
      
      if (models.length > 0 && (!localSettings.model || !models.includes(localSettings.model))) {
          setLocalSettings(prev => ({ ...prev, model: models[0] }));
      }
    } catch (error: any) {
      setTestStatus('error');
      setTestMessage(error.message || "Unable to connect.");
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header with Tabs */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
            <div className="flex space-x-4">
                <button 
                    onClick={() => setActiveTab('ai')}
                    className={`flex items-center gap-2 text-sm font-bold pb-1 border-b-2 transition-colors ${activeTab === 'ai' ? 'text-blue-400 border-blue-400' : 'text-slate-400 border-transparent hover:text-white'}`}
                >
                    <Server size={18} /> AI Settings
                </button>
                <button 
                    onClick={() => setActiveTab('github')}
                    className={`flex items-center gap-2 text-sm font-bold pb-1 border-b-2 transition-colors ${activeTab === 'github' ? 'text-purple-400 border-purple-400' : 'text-slate-400 border-transparent hover:text-white'}`}
                >
                    <Github size={18} /> GitHub
                </button>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
            </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
            
            {activeTab === 'ai' && (
                <>
                {/* Provider Selection */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-slate-500">AI Provider</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => setLocalSettings(s => ({ ...s, provider: 'ollama', connection: { ...s.connection, baseUrl: 'http://localhost:11434' } }))}
                            className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                localSettings.provider === 'ollama' 
                                ? 'bg-blue-600/20 border-blue-500 text-blue-400' 
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                            }`}
                        >
                            <Globe size={16} /> Ollama (Local)
                        </button>
                        <button 
                            onClick={() => setLocalSettings(s => ({ ...s, provider: 'openai', connection: { ...s.connection, baseUrl: 'https://api.openai.com/v1' } }))}
                            className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                localSettings.provider === 'openai' 
                                ? 'bg-purple-600/20 border-purple-500 text-purple-400' 
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                            }`}
                        >
                            <Server size={16} /> OpenAI
                        </button>
                    </div>
                </div>

                {/* Connection Details */}
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400">Base URL</label>
                        <input 
                            type="text" 
                            value={localSettings.connection.baseUrl}
                            onChange={(e) => setLocalSettings(s => ({ ...s, connection: { ...s.connection, baseUrl: e.target.value } }))}
                            className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none"
                            placeholder="http://localhost:11434"
                        />
                    </div>
                    
                    {localSettings.provider === 'openai' && (
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400">API Key</label>
                            <div className="relative">
                                <input 
                                    type="password" 
                                    value={localSettings.connection.apiKey || ''}
                                    onChange={(e) => setLocalSettings(s => ({ ...s, connection: { ...s.connection, apiKey: e.target.value } }))}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-md pl-9 pr-3 py-2 text-sm text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none"
                                    placeholder="sk-..."
                                />
                                <Key size={14} className="absolute left-3 top-2.5 text-slate-500" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Connection Test */}
                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-300">Connection Status</span>
                        <button 
                            onClick={handleTestConnection}
                            disabled={isTesting}
                            className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-slate-300 transition-colors flex items-center gap-1 disabled:opacity-50"
                        >
                           {isTesting ? <RefreshCw className="animate-spin" size={12} /> : <RefreshCw size={12} />} 
                           Test & Refresh
                        </button>
                    </div>
                    
                    {testStatus === 'idle' && (
                         <div className="text-xs text-slate-500 italic">Click test to verify connection.</div>
                    )}
                    {testStatus === 'success' && (
                        <div className="flex items-center gap-2 text-xs text-green-400 bg-green-900/20 p-2 rounded">
                            <CheckCircle size={14} /> {testMessage}
                        </div>
                    )}
                    {testStatus === 'error' && (
                        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-900/20 p-2 rounded break-all">
                            <AlertCircle size={14} /> {testMessage}
                        </div>
                    )}
                </div>

                {/* Model Selection */}
                {availableModels.length > 0 && (
                    <div className="space-y-1 animate-in slide-in-from-top-2">
                        <label className="text-xs text-slate-400">Default Model</label>
                        <select 
                            value={localSettings.model}
                            onChange={(e) => setLocalSettings(s => ({ ...s, model: e.target.value }))}
                            className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none"
                        >
                            {availableModels.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>
                )}
                </>
            )}

            {activeTab === 'github' && (
                <div className="space-y-6">
                    <div className="bg-purple-900/20 border border-purple-500/30 p-3 rounded-lg text-xs text-purple-200 flex gap-2">
                        <Github className="shrink-0" size={16} />
                        <p>Configure GitHub to push your changes directly to a repository. You need a <b>Personal Access Token (Classic)</b> with 'repo' scope.</p>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-slate-400">Personal Access Token</label>
                        <input 
                            type="password" 
                            value={localSettings.github?.token || ''}
                            onChange={(e) => setLocalSettings(s => ({ ...s, github: { ...s.github!, token: e.target.value } }))}
                            className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none"
                            placeholder="ghp_xxxxxxxxxxxx"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400">Repository</label>
                            <input 
                                type="text" 
                                value={localSettings.github?.repo || ''}
                                onChange={(e) => setLocalSettings(s => ({ ...s, github: { ...s.github!, repo: e.target.value } }))}
                                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none"
                                placeholder="username/repo"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400">Branch</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={localSettings.github?.branch || 'main'}
                                    onChange={(e) => setLocalSettings(s => ({ ...s, github: { ...s.github!, branch: e.target.value } }))}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-md pl-8 pr-3 py-2 text-sm text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none"
                                    placeholder="main"
                                />
                                <GitBranch size={14} className="absolute left-3 top-2.5 text-slate-500" />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
            <button 
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
                Cancel
            </button>
            <button 
                onClick={handleSave}
                disabled={testStatus === 'error'}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Save size={16} /> Save
            </button>
        </div>

      </div>
    </div>
  );
};

export default ConfigModal;
