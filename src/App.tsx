/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Copy, RefreshCw, Check, Moon, Sun, Youtube, 
  Sparkles, Hash, AlignLeft, Image as ImageIcon, 
  Search, CheckCircle2, ChevronRight, Menu, X, 
  Download, Clock, BarChart2, FileText, Video, Smartphone,
  TrendingUp, List, PlayCircle
} from 'lucide-react';
import AIAssistant from './components/AIAssistant';
import { GoogleGenAI, Type } from '@google/genai';
import Markdown from 'react-markdown';

type TabType = 'titles' | 'description' | 'hashtags' | 'keywords' | 'thumbnails' | 'hooks' | 'script' | 'fullScript' | 'shorts';

const TABS: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: 'titles', label: 'Titles', icon: Search },
  { id: 'description', label: 'Description', icon: AlignLeft },
  { id: 'hashtags', label: 'Hashtags', icon: Hash },
  { id: 'keywords', label: 'Keywords', icon: Sparkles },
  { id: 'thumbnails', label: 'Thumbnails', icon: ImageIcon },
  { id: 'hooks', label: 'Hooks', icon: Video },
  { id: 'script', label: 'Outline', icon: List },
  { id: 'fullScript', label: 'Full Script', icon: FileText },
  { id: 'shorts', label: 'Shorts Ideas', icon: Smartphone },
];

const Toast = ({ message, visible }: { message: string, visible: boolean }) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.9 }}
        className="fixed top-24 right-6 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 z-50 border border-gray-800 dark:border-gray-200"
      >
        <CheckCircle2 className="w-5 h-5 text-green-400 dark:text-green-600" />
        <span className="font-medium">{message}</span>
      </motion.div>
    )}
  </AnimatePresence>
);

export default function App() {
  const [keyword, setKeyword] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('titles');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Progress State
  const [progress, setProgress] = useState(0);

  // Sidebar & History
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  
  // Analyzer State
  const [isAnalyzerOpen, setIsAnalyzerOpen] = useState(false);
  const [analyzerInput, setAnalyzerInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzerResult, setAnalyzerResult] = useState<{score: number, feedback: string, improvedTitles: string[]} | null>(null);

  // Trending Topics State
  const [isTrendingOpen, setIsTrendingOpen] = useState(false);
  const [trendingInput, setTrendingInput] = useState('');
  const [isFindingTrends, setIsFindingTrends] = useState(false);
  const [trendingTopics, setTrendingTopics] = useState<string[]>([]);

  // Mouse Position for Percentage Cursor
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const [results, setResults] = useState({
    titles: [] as string[],
    description: '',
    hashtags: [] as string[],
    keywords: [] as string[],
    thumbnails: [] as string[],
    hooks: [] as string[],
    script: '',
    fullScript: '',
    shorts: [] as string[]
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('yt_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {}
    }
  }, []);

  // Mouse Move Tracker
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Progress Simulation Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let timeout: NodeJS.Timeout;
    
    if (isGenerating || isAnalyzing || isFindingTrends) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress(p => {
          const increment = Math.random() * 15 + 5;
          return p + increment > 95 ? 95 : p + increment;
        });
      }, 500);
    } else {
      setProgress(100);
      timeout = setTimeout(() => setProgress(0), 800);
    }
    
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isGenerating, isAnalyzing, isFindingTrends]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAll = () => {
    let textToCopy = '';
    switch (activeTab) {
      case 'titles': textToCopy = results.titles.join('\n'); break;
      case 'description': textToCopy = results.description; break;
      case 'hashtags': textToCopy = results.hashtags.join(' '); break;
      case 'keywords': textToCopy = results.keywords.join('\n'); break;
      case 'thumbnails': textToCopy = results.thumbnails.join('\n\n'); break;
      case 'hooks': textToCopy = results.hooks.join('\n\n'); break;
      case 'script': textToCopy = results.script; break;
      case 'fullScript': textToCopy = results.fullScript; break;
      case 'shorts': textToCopy = results.shorts.join('\n\n'); break;
    }
    navigator.clipboard.writeText(textToCopy);
    showToast(`All ${activeTab} copied!`);
  };

  const handleExport = () => {
    if (!hasGenerated) return;
    const content = `Topic: ${keyword}\n\nTITLES:\n${results.titles.join('\n')}\n\nDESCRIPTION:\n${results.description}\n\nHASHTAGS:\n${results.hashtags.join(' ')}\n\nKEYWORDS:\n${results.keywords.join('\n')}\n\nTHUMBNAIL IDEAS:\n${results.thumbnails.join('\n\n')}\n\nHOOKS:\n${results.hooks.join('\n\n')}\n\nSCRIPT OUTLINE:\n${results.script}\n\nFULL SCRIPT:\n${results.fullScript}\n\nSHORTS IDEAS:\n${results.shorts.join('\n\n')}`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${keyword.replace(/\s+/g, '_')}_metadata.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Exported to TXT successfully!");
    setIsSidebarOpen(false);
  };

  const handleGenerate = async (e?: React.FormEvent, overrideKeyword?: string) => {
    if (e) e.preventDefault();
    const targetKeyword = overrideKeyword || keyword;
    
    if (!targetKeyword.trim()) {
      showToast('Please enter a keyword first!');
      return;
    }

    if (overrideKeyword) {
      setKeyword(overrideKeyword);
    }

    setIsGenerating(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `You are an expert YouTube SEO and content strategist. The user wants to create a video about: "${targetKeyword}". Generate highly engaging, viral, and optimized metadata and content ideas.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              titles: { type: Type.ARRAY, items: { type: Type.STRING }, description: "10 highly engaging, viral titles" },
              description: { type: Type.STRING, description: "SEO optimized description with 3 paragraphs, a call to action, and 3 hashtags" },
              hashtags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "15 trending and niche hashtags" },
              keywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "10 long-tail SEO keywords" },
              thumbnails: { type: Type.ARRAY, items: { type: Type.STRING }, description: "5 detailed AI image generation prompts for thumbnails" },
              hooks: { type: Type.ARRAY, items: { type: Type.STRING }, description: "5 engaging hooks for the first 5 seconds of the video" },
              script: { type: Type.STRING, description: "A structured video outline in markdown format (Hook, Intro, 3-5 points, Outro)" },
              fullScript: { type: Type.STRING, description: "A complete, word-for-word, highly engaging YouTube video script including intro, body paragraphs, and outro." },
              shorts: { type: Type.ARRAY, items: { type: Type.STRING }, description: "5 short-form video ideas related to the topic" }
            },
            required: ["titles", "description", "hashtags", "keywords", "thumbnails", "hooks", "script", "fullScript", "shorts"]
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      setResults(data);
      setHasGenerated(true);
      
      // Save to history
      setHistory(prev => {
        const newHist = [targetKeyword, ...prev.filter(k => k !== targetKeyword)].slice(0, 10);
        localStorage.setItem('yt_history', JSON.stringify(newHist));
        return newHist;
      });

    } catch (error) {
      console.error("Generation error:", error);
      showToast("Error generating content. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!analyzerInput.trim()) return;
    
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `Analyze this YouTube video title: "${analyzerInput}". Provide a score out of 100, feedback on why it's good or bad, and 3 improved versions.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER, description: "Score from 1 to 100" },
              feedback: { type: Type.STRING, description: "Detailed feedback on the title" },
              improvedTitles: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 improved versions of the title" }
            },
            required: ["score", "feedback", "improvedTitles"]
          }
        }
      });
      setAnalyzerResult(JSON.parse(response.text || '{}'));
    } catch (error) {
      console.error("Analysis error:", error);
      showToast("Error analyzing title.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFindTrends = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trendingInput.trim()) return;
    
    setIsFindingTrends(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `Find 5 highly trending, high-search-volume YouTube video topics for the following niche or channel URL: "${trendingInput}". Return only the specific video topics.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "List of 5 trending video topics"
          }
        }
      });
      setTrendingTopics(JSON.parse(response.text || '[]'));
    } catch (error) {
      console.error("Trending error:", error);
      showToast("Error finding trends.");
    } finally {
      setIsFindingTrends(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'titles':
      case 'keywords':
        const items = activeTab === 'titles' ? results.titles : results.keywords;
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((item, idx) => (
              <div key={idx} className="group relative p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all hover:shadow-lg hover:-translate-y-0.5">
                <p className="text-gray-800 dark:text-gray-200 pr-10 font-medium">{item}</p>
                <button
                  onClick={() => handleCopy(item, `${activeTab}-${idx}`)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-600 shadow-sm opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                  aria-label="Copy"
                >
                  {copiedId === `${activeTab}-${idx}` ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        );
      
      case 'description':
        return (
          <div className="relative group">
            <textarea
              readOnly
              value={results.description}
              className="w-full h-72 p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium leading-relaxed shadow-inner"
            />
            <button
              onClick={() => handleCopy(results.description, 'desc')}
              className="absolute right-6 top-6 p-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 shadow-sm transition-all hover:bg-white dark:hover:bg-gray-600"
            >
              {copiedId === 'desc' ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        );

      case 'hashtags':
        return (
          <div className="flex flex-wrap gap-3">
            {results.hashtags.map((tag, idx) => (
              <button
                key={idx}
                onClick={() => handleCopy(tag, `tag-${idx}`)}
                className="group flex items-center gap-2 px-5 py-2.5 rounded-full bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all hover:-translate-y-0.5"
              >
                <span className="font-medium">{tag}</span>
                {copiedId === `tag-${idx}` ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-gray-400" />}
              </button>
            ))}
          </div>
        );

      case 'thumbnails':
      case 'hooks':
      case 'shorts':
        const listItems = activeTab === 'thumbnails' ? results.thumbnails : activeTab === 'hooks' ? results.hooks : results.shorts;
        return (
          <div className="space-y-4">
            {listItems.map((item, idx) => (
              <div key={idx} className="group relative p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500 transition-all hover:shadow-lg hover:-translate-y-0.5">
                <div className="flex items-start gap-4">
                  <div className="mt-1 bg-purple-50 dark:bg-purple-900/30 p-3 rounded-xl border border-purple-100 dark:border-purple-800/50">
                    {activeTab === 'thumbnails' ? <ImageIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" /> : 
                     activeTab === 'hooks' ? <Video className="w-5 h-5 text-purple-600 dark:text-purple-400" /> :
                     <Smartphone className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
                  </div>
                  <p className="text-gray-800 dark:text-gray-200 pr-12 leading-relaxed font-medium">{item}</p>
                </div>
                <button
                  onClick={() => handleCopy(item, `${activeTab}-${idx}`)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-gray-600 shadow-sm opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                >
                  {copiedId === `${activeTab}-${idx}` ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        );

      case 'script':
      case 'fullScript':
        const markdownContent = activeTab === 'script' ? results.script : results.fullScript;
        return (
          <div className="relative group bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-inner">
            <div className="markdown-body text-gray-800 dark:text-gray-200">
              <Markdown>{markdownContent}</Markdown>
            </div>
            <button
              onClick={() => handleCopy(markdownContent, activeTab)}
              className="absolute right-6 top-6 p-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 shadow-sm transition-all hover:bg-white dark:hover:bg-gray-600"
            >
              {copiedId === activeTab ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-slate-900 font-sans selection:bg-blue-200 dark:selection:bg-blue-900 transition-colors duration-300">
      
      {/* Percentage Cursor */}
      <AnimatePresence>
        {(isGenerating || isAnalyzing || isFindingTrends) && progress > 0 && progress < 100 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.15 }}
            className="fixed pointer-events-none z-[9999] bg-blue-600 dark:bg-blue-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg shadow-blue-500/30 border border-blue-400 dark:border-blue-300 flex items-center gap-1.5"
            style={{ 
              left: mousePos.x + 15, 
              top: mousePos.y + 15 
            }}
          >
            <RefreshCw className="w-3 h-3 animate-spin" />
            {Math.round(progress)}%
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Progress Bar */}
      {progress > 0 && progress < 100 && (
        <div 
          className="fixed top-0 left-0 h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 z-50 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      )}

      {/* Navbar */}
      <nav className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-800/50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-4">
              {/* Hamburger Menu Moved to Left */}
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                aria-label="Open menu"
              >
                <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              </button>
              
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-red-500 to-red-700 p-2.5 rounded-2xl shadow-lg shadow-red-500/20">
                  <Youtube className="w-6 h-6 text-white" />
                </div>
                <span className="font-extrabold text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 hidden sm:block">
                  TubeSEO<span className="text-blue-600 dark:text-blue-400">.ai</span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className="p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                aria-label="Toggle dark mode"
              >
                {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 h-full w-80 bg-white dark:bg-gray-900 shadow-2xl z-50 border-r border-gray-200 dark:border-gray-800 flex flex-col"
            >
              <div className="p-6 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Pro Tools</h2>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              
              <div className="p-6 flex-1 overflow-y-auto space-y-8">
                {/* Tools */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Generators</h3>
                  <div className="space-y-2">
                    <button 
                      onClick={() => { setIsTrendingOpen(true); setIsSidebarOpen(false); }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-700 dark:text-gray-200 hover:text-purple-600 dark:hover:text-purple-400 transition-colors text-left"
                    >
                      <TrendingUp className="w-5 h-5" />
                      <span className="font-medium">Trending Topics Finder</span>
                    </button>
                    <button 
                      onClick={() => { setIsAnalyzerOpen(true); setIsSidebarOpen(false); }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                    >
                      <BarChart2 className="w-5 h-5" />
                      <span className="font-medium">Title Analyzer</span>
                    </button>
                    <button 
                      onClick={handleExport}
                      disabled={!hasGenerated}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-700"
                    >
                      <Download className="w-5 h-5" />
                      <span className="font-medium">Export Results (TXT)</span>
                    </button>
                  </div>
                </div>

                {/* History */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Recent Searches
                  </h3>
                  {history.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500 italic">No recent searches</p>
                  ) : (
                    <div className="space-y-2">
                      {history.map((hist, idx) => (
                        <button 
                          key={idx}
                          onClick={() => { setKeyword(hist); setIsSidebarOpen(false); handleGenerate(undefined, hist); }}
                          className="w-full text-left p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm truncate transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                        >
                          {hist}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Trending Topics Modal */}
      <AnimatePresence>
        {isTrendingOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsTrendingOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[90vh]"
              >
                <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-purple-500" /> Trending Topics Finder
                  </h2>
                  <button onClick={() => setIsTrendingOpen(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                  <form onSubmit={handleFindTrends} className="mb-8">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Enter your Niche or YouTube Channel URL:</label>
                    <div className="flex gap-3">
                      <input 
                        type="text" 
                        value={trendingInput}
                        onChange={e => setTrendingInput(e.target.value)}
                        placeholder="e.g., Tech Reviews, Cooking, or youtube.com/@channel"
                        className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                      <button 
                        type="submit"
                        disabled={!trendingInput.trim() || isFindingTrends}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {isFindingTrends ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Find Trends'}
                      </button>
                    </div>
                  </form>

                  {isFindingTrends && (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                      <div className="w-12 h-12 border-4 border-purple-100 dark:border-gray-700 border-t-purple-600 rounded-full animate-spin"></div>
                      <p className="text-purple-600 dark:text-purple-400 font-bold text-xl">{Math.round(progress)}%</p>
                      <p className="text-gray-500 dark:text-gray-400 font-medium">Scanning YouTube for trends...</p>
                    </div>
                  )}

                  {trendingTopics.length > 0 && !isFindingTrends && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Top Trending Topics:</h3>
                      <div className="space-y-3">
                        {trendingTopics.map((topic, idx) => (
                          <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl gap-4">
                            <span className="font-medium text-gray-800 dark:text-gray-200 flex-1">{topic}</span>
                            <button 
                              onClick={() => {
                                setIsTrendingOpen(false);
                                handleGenerate(undefined, topic);
                              }} 
                              className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800/50 rounded-lg transition-colors font-medium text-sm flex items-center justify-center gap-2 whitespace-nowrap"
                            >
                              <PlayCircle className="w-4 h-4" /> Generate Metadata
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Title Analyzer Modal */}
      <AnimatePresence>
        {isAnalyzerOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsAnalyzerOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[90vh]"
              >
                <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <BarChart2 className="w-6 h-6 text-blue-500" /> Title Analyzer
                  </h2>
                  <button onClick={() => setIsAnalyzerOpen(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                  <form onSubmit={handleAnalyze} className="mb-8">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Enter your YouTube title to test:</label>
                    <div className="flex gap-3">
                      <input 
                        type="text" 
                        value={analyzerInput}
                        onChange={e => setAnalyzerInput(e.target.value)}
                        placeholder="e.g., How to bake a cake"
                        className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <button 
                        type="submit"
                        disabled={!analyzerInput.trim() || isAnalyzing}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {isAnalyzing ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Analyze'}
                      </button>
                    </div>
                  </form>

                  {isAnalyzing && (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                      <div className="w-12 h-12 border-4 border-blue-100 dark:border-gray-700 border-t-blue-600 rounded-full animate-spin"></div>
                      <p className="text-blue-600 dark:text-blue-400 font-bold text-xl">{Math.round(progress)}%</p>
                      <p className="text-gray-500 dark:text-gray-400 font-medium">Analyzing title psychology...</p>
                    </div>
                  )}

                  {analyzerResult && !isAnalyzing && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex items-center gap-6 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                        <div className="relative flex items-center justify-center w-24 h-24">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="48" cy="48" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-200 dark:text-gray-700" />
                            <circle cx="48" cy="48" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray="226.2" strokeDashoffset={226.2 - (226.2 * analyzerResult.score) / 100} className={`${analyzerResult.score > 70 ? 'text-green-500' : analyzerResult.score > 40 ? 'text-yellow-500' : 'text-red-500'} transition-all duration-1000`} />
                          </svg>
                          <span className="absolute text-2xl font-bold text-gray-900 dark:text-white">{analyzerResult.score}</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Viral Potential</h3>
                          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{analyzerResult.feedback}</p>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Try these improved versions:</h3>
                        <div className="space-y-3">
                          {analyzerResult.improvedTitles.map((title, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                              <span className="font-medium text-gray-800 dark:text-gray-200">{title}</span>
                              <button onClick={() => handleCopy(title, `analyze-${idx}`)} className="p-2 text-gray-400 hover:text-blue-500 transition-colors">
                                {copiedId === `analyze-${idx}` ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 text-center max-w-4xl mx-auto flex-shrink-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold text-sm mb-8 border border-blue-100 dark:border-blue-800/50 shadow-sm">
            <Sparkles className="w-4 h-4" />
            <span>Powered by Gemini 3.1 Pro</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-6 leading-tight">
            Generate Viral <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-orange-500 to-red-600">
              YouTube Metadata
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Stop guessing what works. Use our real AI engine to generate high-CTR titles, SEO-optimized descriptions, hooks, full scripts, and trending hashtags instantly.
          </p>

          <form onSubmit={handleGenerate} className="relative max-w-2xl mx-auto group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative flex items-center">
              <Search className="absolute left-6 w-6 h-6 text-gray-400" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Enter your main video topic or keyword..."
                className="w-full pl-16 pr-40 py-5 text-lg rounded-2xl border-2 border-gray-100 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-500 transition-all shadow-xl placeholder-gray-400 dark:placeholder-gray-500"
              />
              <button
                type="submit"
                disabled={isGenerating || !keyword.trim()}
                className="absolute right-2.5 top-2.5 bottom-2.5 px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30"
              >
                {isGenerating ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Generate <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </section>

      {/* Results Section */}
      {hasGenerated && (
        <motion.section 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto px-4 pb-24 w-full"
        >
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-3xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden">
            
            {/* Tabs */}
            <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700 hide-scrollbar bg-gray-50/50 dark:bg-gray-900/50">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-5 font-semibold text-sm transition-colors relative whitespace-nowrap ${
                      isActive 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    {isActive && (
                      <motion.div 
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Content Area */}
            <div className="p-6 md:p-10">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  {TABS.find(t => t.id === activeTab)?.label} Results
                </h2>
                <div className="flex gap-3 w-full sm:w-auto">
                  <button 
                    onClick={() => handleGenerate()}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors border border-transparent hover:border-gray-300 dark:hover:border-gray-500"
                  >
                    <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                    <span>Regenerate</span>
                  </button>
                  <button 
                    onClick={handleCopyAll}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/60 transition-colors border border-transparent hover:border-blue-300 dark:hover:border-blue-700"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copy All</span>
                  </button>
                </div>
              </div>

              <div className="min-h-[350px]">
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center h-full py-24 space-y-6">
                    <div className="w-16 h-16 border-4 border-blue-100 dark:border-gray-700 border-t-blue-600 dark:border-t-blue-500 rounded-full animate-spin"></div>
                    <p className="text-blue-600 dark:text-blue-400 font-bold text-3xl">{Math.round(progress)}%</p>
                    <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse text-lg">AI is generating magic...</p>
                  </div>
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      {renderTabContent()}
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            </div>
          </div>
        </motion.section>
      )}

      {/* Footer */}
      <footer className="w-full py-8 border-t border-gray-200/50 dark:border-gray-800/50 mt-auto bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
            © {new Date().getFullYear()} TubeSEO.ai. Built for YouTube Creators.
          </p>
        </div>
      </footer>

      <Toast message={toastMessage} visible={!!toastMessage} />
      <AIAssistant />
    </div>
  );
}
