
import React, { useState, useEffect } from 'react';
import { analyzeCompetitors, generateOutlineSuggestions, generateOutline, refineOutlineWithAI, selectRelevantInternalLinks, generateKeywordStrategy, findEeatSources } from '../services/gemini';
import { callWebhookTool } from '../services/webhook';
import { AppState, CompetitorInfo, InternalLink, RankedKeyword, ResearchResult, EeatSource } from '../types';
import Loader from './Loader';
import ThinkingProcess from './ThinkingProcess';

// Icons
const IconPlus = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>;
const IconX = (props: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={props.className || 'h-5 w-5'} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const IconSparkles = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 1a4 4 0 00-4 4v10a4 4 0 004 4h10a4 4 0 004-4V5a4 4 0 00-4-4H5z" /><path d="M10.707 6.293a1 1 0 00-1.414 0L6 9.586V7a1 1 0 00-2 0v4a1 1 0 001 1h4a1 1 0 000-2H7.414l3.293-3.293a1 1 0 000-1.414z" /></svg>;
const IconLink = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" /></svg>;
const IconShieldCheck = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>;

interface Props {
    appState: AppState;
    onOutlineComplete: (outline: string[], internalLinks: InternalLink[]) => void;
}

const RESEARCH_STEPS = [
    "Initiating deep-dive topic research...",
    "Fetching site rankings & internal links...",
    "Analyzing top 10 competitor articles...",
    "Identifying content gaps & opportunities...",
    "Extracting authoritative E-E-A-T sources...",
    "Designing 'Answer-First' structure...",
    "Refining for Generative Engine Optimization..."
];

const OUTLINE_GENERATION_STEPS = [
    "Synthesizing competitor analysis...",
    "Structuring 'Answer-First' hierarchy...",
    "Mapping internal linking opportunities...",
    "Integrating semantic keywords...",
    "Finalizing GEO-optimized outline..."
];

const ResearchAndOutline: React.FC<Props> = ({ appState, onOutlineComplete }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Data states
    const [researchData, setResearchData] = useState<Omit<ResearchResult, 'outline'>>({ keywords: [], competitors: [] });
    const [groundingLinks, setGroundingLinks] = useState<CompetitorInfo[]>([]);
    const [rankedKeywords, setRankedKeywords] = useState<RankedKeyword[]>([]);
    const [allInternalLinks, setAllInternalLinks] = useState<InternalLink[]>([]);
    const [relevantInternalLinks, setRelevantInternalLinks] = useState<InternalLink[]>([]);
    const [eeatSources, setEeatSources] = useState<EeatSource[]>([]);

    // UI States
    const [keywords, setKeywords] = useState<string[]>([]);
    const [newKeyword, setNewKeyword] = useState('');
    const [structureSuggestions, setStructureSuggestions] = useState<string[]>([]);
    const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
    const [editableOutline, setEditableOutline] = useState('');
    const [isOutlineModalOpen, setIsOutlineModalOpen] = useState(false);
    const [isEditingOutline, setIsEditingOutline] = useState(false);
    const [isRefiningOutline, setIsRefiningOutline] = useState(false);
    const [isSelectingLinks, setIsSelectingLinks] = useState(false);
    const [newInternalLink, setNewInternalLink] = useState({ title: '', url: '' });
    
    useEffect(() => {
        const performResearch = async () => {
            if (!appState.topic) return;
            setLoading(true);
            setError(null);
            
            try {
                // Helper to swallow errors for optional tools
                const safeWebhookCall = async <T,>(promise: Promise<T>, fallback: T): Promise<T> => {
                    try {
                        return await promise;
                    } catch (e) {
                        console.warn("Optional webhook tool failed, proceeding with fallback:", e);
                        return fallback;
                    }
                };

                // Step 1: Fetch foundational data from webhooks first
                // Using safeWebhookCall to prevent "Failed to fetch" from blocking the entire flow
                const [rankedKeywordsData, internalLinksData] = await Promise.all([
                    safeWebhookCall(callWebhookTool('page_ranked_keywords', appState), [] as RankedKeyword[]),
                    safeWebhookCall(callWebhookTool('url_map', appState), [] as InternalLink[]),
                ]);
                
                setRankedKeywords(rankedKeywordsData);
                setAllInternalLinks(internalLinksData);

                // Step 2: Once we have ranked keywords (or empty fallback), run the dependent AI tasks
                const partialWebhookCaller = (func: 'suggested_keywords', params: { keyword: string }) => {
                    return callWebhookTool(func, appState, params);
                };
                
                const [
                    finalKeywords,
                    { competitors, groundingLinks },
                    suggestions,
                    foundSources,
                ] = await Promise.all([
                    generateKeywordStrategy(appState.topic, rankedKeywordsData, partialWebhookCaller),
                    analyzeCompetitors(appState.topic),
                    generateOutlineSuggestions(appState.topic),
                    findEeatSources(appState.topic),
                ]);

                setKeywords(finalKeywords);
                setResearchData({ keywords: finalKeywords, competitors });
                setGroundingLinks(groundingLinks);
                setStructureSuggestions(suggestions);
                setEeatSources(foundSources);

            } catch (err: any) {
                setError(err.message || "An error occurred during research.");
            } finally {
                setLoading(false);
            }
        };
        performResearch();
    }, [appState.topic, appState.websiteUrl, appState.country, appState.language]);

     useEffect(() => {
        if (allInternalLinks.length > 0) {
            const getRelevantLinks = async () => {
                setIsSelectingLinks(true);
                setError(null);
                try {
                    const links = await selectRelevantInternalLinks(appState.topic, allInternalLinks);
                    setRelevantInternalLinks(links);
                } catch(err: any) {
                    // Don't set main error here, just log
                    console.warn("Failed to get AI-selected internal links.", err);
                } finally {
                    setIsSelectingLinks(false);
                }
            };
            getRelevantLinks();
        }
    }, [allInternalLinks, appState.topic]);
    
    const handleAddKeyword = () => {
        if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
            setKeywords([...keywords, newKeyword.trim()]);
            setNewKeyword('');
        }
    };

    const handleRemoveKeyword = (kwToRemove: string) => {
        setKeywords(keywords.filter(kw => kw !== kwToRemove));
    };

    const handleAddInternalLink = () => {
        if (newInternalLink.title.trim() && newInternalLink.url.trim()) {
            setRelevantInternalLinks([...relevantInternalLinks, newInternalLink]);
            setNewInternalLink({ title: '', url: '' });
        }
    };

    const handleRemoveInternalLink = (urlToRemove: string) => {
        setRelevantInternalLinks(relevantInternalLinks.filter(link => link.url !== urlToRemove));
    };

    const handleGenerateOutline = async () => {
        setIsGeneratingOutline(true);
        setError(null);
        try {
            const outline = await generateOutline(appState.topic, keywords, researchData.competitors, relevantInternalLinks);
            setEditableOutline(outline.join('\n'));
            setIsEditingOutline(false); // Default to preview mode
            setIsOutlineModalOpen(true);
        } catch (err: any) {
            setError(err.message || "Failed to generate outline.");
        } finally {
            setIsGeneratingOutline(false);
        }
    };

    const handleRefineOutline = async () => {
        setIsRefiningOutline(true);
        setError(null);
        try {
            const refinedOutline = await refineOutlineWithAI(
                editableOutline,
                appState.topic,
                keywords,
                researchData.competitors,
                relevantInternalLinks
            );
            setEditableOutline(refinedOutline.join('\n'));
            setIsEditingOutline(false); // Switch back to preview mode to see changes
        } catch (err: any) {
             setError(err.message || "Failed to refine outline.");
        } finally {
            setIsRefiningOutline(false);
        }
    };

    const handleContinue = () => {
        const outlineArray = editableOutline.split('\n').filter(line => line.trim() !== '');
        onOutlineComplete(outlineArray, relevantInternalLinks);
        setIsOutlineModalOpen(false);
    };

    if (loading) return <ThinkingProcess messages={RESEARCH_STEPS} />;
    if (error && !researchData.competitors.length) return <div className="text-red-400 bg-red-900/50 p-4 rounded-lg">{error}</div>;

    return (
        <div className="h-full flex flex-col animate-fade-in">
            <header className="mb-8">
                <h2 className="text-3xl font-bold text-slate-100">Step 2: Research & Outline</h2>
                <p className="text-slate-400 mt-2">Topic: <span className="font-semibold text-indigo-400">"{appState.topic}"</span></p>
            </header>
            {error && <div className="text-red-400 bg-red-900/50 p-4 rounded-lg mb-4">{error}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-grow overflow-hidden">
                {/* Left Column */}
                <div className="flex flex-col gap-6 overflow-y-auto pr-2">
                    <div className="bg-slate-800/50 p-4 rounded-lg">
                        <h3 className="font-semibold text-indigo-400 mb-3">Target Keywords</h3>
                        <div className="flex flex-wrap gap-2 items-center">
                            {keywords.map((kw) => (
                                <span key={kw} className="flex items-center bg-slate-700 text-slate-200 pl-3 pr-2 py-1 rounded-full text-sm">
                                    {kw}
                                    <button onClick={() => handleRemoveKeyword(kw)} className="ml-2 rounded-full hover:bg-slate-600 p-0.5"><IconX className="h-4 w-4"/></button>
                                </span>
                            ))}
                            <div className="flex gap-2">
                                <input type="text" value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()} placeholder="Add keyword" className="bg-slate-900/70 text-sm px-3 py-1 rounded-md border border-slate-600 focus:ring-1 focus:ring-indigo-500 outline-none w-32" />
                                <button onClick={handleAddKeyword} className="bg-indigo-600 rounded-md p-1.5 hover:bg-indigo-700"><IconPlus/></button>
                            </div>
                        </div>
                    </div>

                     <div className="bg-slate-800/50 p-4 rounded-lg">
                        <h3 className="font-semibold text-indigo-400 mb-2">Competitor Analysis</h3>
                        <div className="space-y-3">{researchData?.competitors.map((c, i) => (<div key={i}><p className="font-semibold">{c.title}</p><p className="text-sm text-slate-400">{c.summary}</p></div>))}</div>
                    </div>

                    <div className="bg-slate-800/50 p-4 rounded-lg">
                        <h3 className="font-semibold text-green-400 mb-2 flex items-center"><IconShieldCheck/> E-E-A-T Sources (for citation)</h3>
                        <div className="space-y-3">
                            {eeatSources.map((s, i) => (
                                <div key={i}>
                                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-400 hover:underline">{s.title}</a>
                                    <p className="text-sm text-slate-400">{s.summary}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                     <div className="bg-slate-800/50 p-4 rounded-lg">
                        <h3 className="font-semibold text-indigo-400 mb-2">Sources</h3>
                        <ul className="list-disc list-inside space-y-1 text-sm">{groundingLinks.map((link, i) => <li key={i}><a href={link.url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">{link.title}</a></li>)}</ul>
                    </div>
                </div>

                {/* Right Column */}
                <div className="flex flex-col gap-6 overflow-y-auto pr-2">
                    <div className="bg-slate-800/50 p-4 rounded-lg">
                        <h3 className="font-semibold text-indigo-400 mb-3 flex items-center"><IconLink /> Internal Linking Strategy</h3>
                        {isSelectingLinks ? <Loader message="AI is selecting relevant links..."/> : 
                        (<div className="space-y-2">
                            {relevantInternalLinks.map(link => (
                                <div key={link.url} className="flex items-center justify-between bg-slate-900/50 p-2 rounded-md">
                                    <div className="text-sm">
                                        <p className="font-medium text-slate-300">{link.title}</p>
                                        <p className="text-xs text-slate-500">{link.url}</p>
                                    </div>
                                    <button onClick={() => handleRemoveInternalLink(link.url)} className="p-1 rounded-full hover:bg-slate-700"><IconX className="h-4 w-4" /></button>
                                </div>
                            ))}
                             <div className="flex gap-2 pt-2">
                                <input type="text" value={newInternalLink.title} onChange={(e) => setNewInternalLink(p => ({ ...p, title: e.target.value }))} placeholder="Link Title" className="bg-slate-900/70 text-sm px-3 py-1 rounded-md border border-slate-600 focus:ring-1 focus:ring-indigo-500 outline-none flex-grow" />
                                <input type="text" value={newInternalLink.url} onChange={(e) => setNewInternalLink(p => ({ ...p, url: e.target.value }))} placeholder="/link-url" className="bg-slate-900/70 text-sm px-3 py-1 rounded-md border border-slate-600 focus:ring-1 focus:ring-indigo-500 outline-none flex-grow" />
                                <button onClick={handleAddInternalLink} className="bg-indigo-600 rounded-md p-1.5 hover:bg-indigo-700"><IconPlus/></button>
                            </div>
                        </div>)}
                    </div>
                    <div className="flex flex-col bg-slate-800/50 rounded-lg p-4 flex-grow">
                        {isGeneratingOutline ? (
                             <div className="flex flex-col h-full justify-center">
                                <ThinkingProcess messages={OUTLINE_GENERATION_STEPS} />
                             </div>
                        ) : (
                            <>
                                <h3 className="text-lg font-semibold text-indigo-400 mb-3">Outline Generation</h3>
                                <div className="bg-slate-900/50 p-3 rounded-md mb-4">
                                    <h4 className="font-semibold text-slate-300 text-sm mb-2">AI Suggestions for Structure:</h4>
                                    <div className="flex flex-wrap gap-2 items-center">
                                        {structureSuggestions.map((sugg) => (
                                            <span key={sugg} className="flex items-center bg-slate-700/80 text-slate-300 pl-3 pr-2 py-1 rounded-full text-xs">
                                                {sugg}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex-grow flex items-center justify-center">
                                    <button onClick={handleGenerateOutline} className="w-full max-w-xs px-6 py-3 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700 transition-colors">
                                        Generate Full Outline
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {isOutlineModalOpen && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl w-full max-w-3xl h-[90vh] flex flex-col">
                        <header className="p-4 border-b border-slate-700 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-indigo-400">Your Generated Outline</h3>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setIsEditingOutline(prev => !prev)}
                                    className="px-4 py-2 text-sm font-semibold bg-slate-700 rounded-md hover:bg-slate-600 transition-colors"
                                >
                                    {isEditingOutline ? 'Preview Mode' : 'Edit Mode'}
                                </button>
                                <button onClick={() => setIsOutlineModalOpen(false)} className="p-2 rounded-full hover:bg-slate-700"><IconX /></button>
                            </div>
                        </header>
                         {error && <div className="text-red-400 bg-red-900/50 p-3 m-4 rounded-lg text-sm">{error}</div>}
                        <div className="p-6 flex-grow overflow-y-auto">
                            {isEditingOutline ? (
                                 <textarea value={editableOutline} onChange={(e) => setEditableOutline(e.target.value)} placeholder="Your outline will appear here..." className="w-full h-full bg-slate-900/70 p-4 border border-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
                            ) : (
                                <div className="space-y-2">
                                    {editableOutline.split('\n').filter(line => line.trim() !== '').map((line, index) => {
                                        const indentMatch = line.match(/^(\s*)/);
                                        const indentation = indentMatch ? indentMatch[1].length : 0;
                                        const indentLevel = Math.floor(indentation / 2);
                                        const cleanLine = line.trim().replace(/^- \s*/, '');

                                        return (
                                            <div key={index} style={{ paddingLeft: `${indentLevel * 24}px` }} className="flex items-start gap-3 py-1">
                                                <span className={`mt-1.5 flex-shrink-0 w-2 h-2 rounded-full ${indentLevel === 0 ? 'bg-indigo-400' : 'bg-slate-500'}`}></span>
                                                <p className={`text-slate-300 ${indentLevel === 0 ? 'font-semibold text-slate-100' : 'text-slate-400'}`}>
                                                    {cleanLine}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <footer className="p-4 border-t border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <button onClick={handleRefineOutline} disabled={isRefiningOutline || !editableOutline.trim()} className="flex items-center justify-center w-full sm:w-auto px-4 py-2 bg-slate-700 text-white rounded-md font-semibold hover:bg-slate-600 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors">
                                {isRefiningOutline ? 'Refining...' : <><IconSparkles /> Refine with AI</>}
                            </button>
                            <button onClick={handleContinue} disabled={!editableOutline.trim()} className="w-full sm:w-auto px-6 py-2 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed">
                                Generate Draft
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResearchAndOutline;
