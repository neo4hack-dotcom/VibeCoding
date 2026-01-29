
import { OllamaTagResponse, OpenAIModelResponse, Settings } from '../types';

// Helper pour gérer le fetch avec fallback (tentative via proxy en cas d'erreur CORS)
const safeFetch = async (url: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(url, options);
    return response;
  } catch (error: any) {
    console.warn("Direct fetch failed, checking fallback...", error.message);
    
    // Détection large des erreurs réseau (CORS, Offline, Refused)
    const isNetworkError = 
        error.message === 'Load failed' || 
        error.message === 'Failed to fetch' || 
        error.name === 'TypeError' ||
        error.message.includes('NetworkError');

    if (isNetworkError) {
      // Si on cible localhost, on tente via le proxy Vite (chemin relatif)
      if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('0.0.0.0')) {
         console.info("Switching to Proxy fallback...");
         
         try {
             // Extraction propre du chemin relatif (ex: http://localhost:11434/api/tags -> /api/tags)
             const urlObj = new URL(url);
             const relativeUrl = urlObj.pathname + urlObj.search;
             return await fetch(relativeUrl, options);
         } catch (e) {
             console.error("Failed to construct proxy URL", e);
             throw error;
         }
      }
    }
    throw error;
  }
};

const handleApiError = async (response: Response, provider: string) => {
    const status = response.status;
    let text = "";
    try { text = await response.text(); } catch(e) {}
    
    // Détection spécifique pour le Proxy Vite qui renvoie index.html (404 Not Found) quand la route n'existe pas ou le target échoue
    if (status === 404 && (text.includes('<!DOCTYPE html>') || text.includes('File not found') || text.includes('Cannot GET'))) {
        throw new Error(
            `Connection Failed. \n\n` +
            `1. Ensure Ollama is running (port 11434).\n` +
            `2. If running locally, check if 'vite.config.ts' uses '127.0.0.1' instead of 'localhost'.\n` +
            `3. Check console logs for CORS errors.`
        );
    }

    throw new Error(`API Error ${status}: ${text || response.statusText}`);
};

// Fonction générique pour récupérer les modèles selon le provider
export const getModels = async (settings: Settings): Promise<string[]> => {
  const { provider, connection } = settings;
  const baseUrl = (connection.baseUrl || '').trim().replace(/\/+$/, '');

  try {
    let url = '';
    let headers: Record<string, string> = {};

    if (provider === 'openai') {
        url = `${baseUrl}/models`;
        headers = {
            'Authorization': `Bearer ${connection.apiKey || ''}`,
            'Content-Type': 'application/json'
        };
    } else {
        const effectiveBaseUrl = baseUrl || 'http://localhost:11434';
        url = `${effectiveBaseUrl}/api/tags`;
    }

    const response = await safeFetch(url, { headers });
    
    if (!response.ok) {
        await handleApiError(response, provider);
    }

    const data = await response.json();

    if (provider === 'openai') {
        const openAIData = data as OpenAIModelResponse;
        return openAIData.data.map(m => m.id);
    } else {
        const ollamaData = data as OllamaTagResponse;
        return ollamaData.models.map(m => m.name);
    }

  } catch (error: any) {
    console.error("Error fetching models:", error);
    // On ne relance pas l'erreur si c'est déjà une erreur formatée
    if (error.message.includes('Connection Failed') || error.message.includes('API Error')) {
        throw error;
    }
    throw new Error(`Connection Error: ${error.message}`);
  }
};

export const generateCode = async (
  model: string, 
  prompt: string,
  systemPrompt: string,
  settings?: Settings,
  images: string[] = [] // Ajout du support images
): Promise<string> => {
  
  const provider = settings?.provider || 'ollama';
  const baseUrl = (settings?.connection.baseUrl || '').trim().replace(/\/+$/, '') || 'http://localhost:11434';
  const apiKey = settings?.connection.apiKey || '';

  try {
    let url = '';
    let body: any = {};
    let headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };

    if (provider === 'openai') {
        url = `${baseUrl}/chat/completions`;
        headers['Authorization'] = `Bearer ${apiKey}`;
        
        let messages: any[] = [{ role: "system", content: systemPrompt }];

        // Construction du message utilisateur (mixte texte + images)
        if (images.length > 0) {
            const content: any[] = [{ type: "text", text: prompt }];
            images.forEach(img => {
                content.push({
                    type: "image_url",
                    image_url: { url: img } // OpenAI attend une URL ou data URI complète
                });
            });
            messages.push({ role: "user", content: content });
        } else {
            messages.push({ role: "user", content: prompt });
        }
        
        body = {
            model: model,
            messages: messages,
            temperature: 0.7,
            max_tokens: 4096 
        };
    } else {
        url = `${baseUrl}/api/generate`;
        
        // Pour Ollama, les images sont un champ séparé
        // Ollama attend généralement le base64 RAW (sans le préfixe data:image/...)
        const cleanImages = images.map(img => {
            // Retire "data:image/png;base64," si présent
            return img.replace(/^data:image\/[a-z]+;base64,/, "");
        });

        body = {
            model,
            prompt,
            system: systemPrompt,
            stream: false,
            images: cleanImages.length > 0 ? cleanImages : undefined,
            options: {
                temperature: 0.7,
                num_ctx: 4096
            }
        };
    }

    const response = await safeFetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
        await handleApiError(response, provider);
    }

    const data = await response.json();

    if (provider === 'openai') {
        return data.choices?.[0]?.message?.content || "";
    } else {
        return data.response;
    }

  } catch (error) {
    console.error("Generation error:", error);
    throw error;
  }
};

export const extractCodeFromResponse = (response: string): string | null => {
  const codeBlockRegex = /```(?:tsx|typescript|javascript|jsx|markdown|md)?\s*([\s\S]*?)\s*```/;
  const match = response.match(codeBlockRegex);
  return match ? match[1] : null;
};

export const detectSecrets = (code: string): boolean => {
    const secretPatterns = [
        /sk-[a-zA-Z0-9]{20,}/,
        /(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/,
        /(ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36,}/,
        /-----BEGIN (?:RSA )?PRIVATE KEY-----/,
        /xox[baprs]-([0-9a-zA-Z]{10,48})?/,
        /AIza[0-9A-Za-z\\-_]{35}/,
    ];
    return secretPatterns.some(pattern => pattern.test(code));
};
