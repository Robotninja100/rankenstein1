
import React, { useState } from 'react';
import { generateTopicIdeas, generateTopicIdeasForWebsite } from '../services/gemini';
import { AppState, TopicIdea } from '../types';
import Loader from './Loader';
import ThinkingProcess from './ThinkingProcess';

interface Props {
    appState: AppState;
    onTopicSelect: (topic: string) => void;
}

const MANUAL_IDEATION_STEPS = [
    "Connecting to Google Trends database...",
    "Analyzing search volume patterns...",
    "Identifying high-potential keywords...",
    "Filtering for 'Answer-First' opportunities...",
    "Structuring final topic candidates..."
];

const AUTO_IDEATION_STEPS = [
    "Crawling website structure...",
    "Analyzing existing content & niche...",
    "Identifying topical authority gaps...",
    "Cross-referencing with search demand...",
    "Generating tailored suggestions..."
];

const IconMagicWand = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v1.046a1 1 0 01-1.447.894l-.849-.424a1 1 0 01-.299-1.211l.245-.978A1 1 0 0111.3 1.046zM6.8 2.553a1 1 0 011.211.299l.424.849a1 1 0 01-.894 1.447L6.5 4.102a1 1 0 01-1.211-.299l-.245-.978a1 1 0 011.255-1.272zM2.553 6.8a1 1 0 01.299-1.211l.978-.245a1 1 0 011.272 1.255l-.424.849a1 1 0 01-1.447.894L2.502 6.5a1 1 0 01.051-1.299zM1.046 11.3a1 1 0 011.046-1 1 1 0 01.894 1.447l-.424.849a1 1 0 01-1.211.299l-.978-.245a1 1 0 01.255-1.272zM4.102 14.5a1 1 0 01.894-1.447l.849.424a1 1 0 01.299 1.211l-.245.978a1 1 0 01-1.255 1.272l-.978-.245a1 1 0 01-.299-1.211zM8.148 15.852a1 1 0 011.106-1.106l5-5a1 1 0 011.414 1.414l-5 5a1 1 0 01-1.414 0l-.106-.106z" clipRule="evenodd" /><path d="M10.293 6.293a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414z" /></svg>;

const TopicIdeation: React.FC<Props> = ({ appState, onTopicSelect }) => {
    const [theme, setTheme] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingType, setLoadingType] = useState<'manual' | 'auto'>('manual');
    const [result, setResult] = useState<TopicIdea[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!theme.trim()) return;

        setLoading(true);
        setLoadingType('manual');
        setError(null);
        setResult(null);

        try {
            const ideas = await generateTopicIdeas(theme);
            setResult(ideas);
        } catch (err: any) {
            setError(err.message || "An unknown error occurred.");
        } finally {
            setLoading(false);
        }
    };
    
    const handleAutoGenerate = async () => {
        setLoading(true);
        setLoadingType('auto');
        setError(null);
        setResult(null);
        try {
            const ideas = await generateTopicIdeasForWebsite(appState.websiteUrl, appState.country, appState.language);
            setResult(ideas);
        } catch (err: any) {
            setError(err.message || "An unknown error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <header className="mb-8">
                <h2 className="text-3xl font-bold text-slate-100">Step 1: Topic Ideation</h2>
                <p className="text-slate-400 mt-2">Enter a theme to get started, or let AI find topics based on your website.</p>
            </header>
            
            <div className="flex-shrink-0 mb-8">
                <form onSubmit={handleSubmit}>
                    <div className="relative">
                        <input
                            type="text"
                            value={theme}
                            onChange={(e) => setTheme(e.target.value)}
                            placeholder="e.g., 'sustainable gardening', 'AI in marketing', 'home coffee brewing'"
                            className="w-full pl-4 pr-36 py-4 bg-slate-800 border-2 border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            disabled={loading || !theme.trim()}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 px-6 py-2 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? 'Searching...' : 'Find Topics'}
                        </button>
                    </div>
                </form>

                <div className="flex items-center text-slate-500 my-4">
                    <div className="flex-grow border-t border-slate-700"></div>
                    <span className="flex-shrink mx-4 text-sm font-semibold">OR</span>
                    <div className="flex-grow border-t border-slate-700"></div>
                </div>

                <div className="flex justify-center">
                    <button 
                        onClick={handleAutoGenerate}
                        disabled={loading}
                        className="px-6 py-3 bg-slate-700 text-white rounded-md font-semibold hover:bg-slate-600 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                    >
                        <IconMagicWand />
                        Let AI Find Topics For My Website
                    </button>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto pr-2">
                {loading && <ThinkingProcess messages={loadingType === 'manual' ? MANUAL_IDEATION_STEPS : AUTO_IDEATION_STEPS} />}
                {error && <div className="text-red-400 bg-red-900/50 p-4 rounded-lg">{error}</div>}
                
                {result && (
                    <div className="space-y-4 animate-fade-in">
                        <h3 className="text-xl font-semibold text-slate-200">Choose a Topic to Continue:</h3>
                       {result.map((idea, i) => (
                           <div key={i} className="bg-slate-800/50 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-slate-700/50 hover:border-indigo-500/50 transition-colors">
                               <div className="flex-grow">
                                   <h4 className="font-semibold text-indigo-400">{idea.title}</h4>
                                   <p className="text-slate-400 text-sm mt-1">{idea.description}</p>
                               </div>
                               <button 
                                   onClick={() => onTopicSelect(idea.title)}
                                   className="px-4 py-2 bg-slate-700 text-white rounded-md font-semibold hover:bg-slate-600 transition-colors flex-shrink-0 w-full sm:w-auto"
                                >
                                   Select & Continue
                                </button>
                           </div>
                       ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TopicIdeation;
