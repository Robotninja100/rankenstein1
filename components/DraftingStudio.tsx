
import React, { useState, useEffect, useRef } from 'react';
import { generateLongFormContent, transformText, generateArticleImage, reviewArticle, editArticleImage, generateContextualAddition, chatWithDraft } from '../services/gemini';
import { AppState } from '../types';
import Loader from './Loader';
import MarkdownRenderer from './MarkdownRenderer';
import ThinkingProcess from './ThinkingProcess';
import { GlowingEffect } from './ui/GlowingEffect';

// Icons
const IconBriefcase = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
const IconArrowsExpand = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 1v4m0 0h-4m4 0l-5-5" /></svg>;
const IconScissors = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.121 14.121L19 19m-7.071-7.071L12 14.828l-2.121-2.121m0 0L7.879 7.879m7.071 7.071L12 12m-2.121 2.121l-7.071 7.071" /><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 7.657a5 5 0 11-7.071 0 5 5 0 017.071 0zm-7.071 7.071a5 5 0 11-7.071 0 5 5 0 017.071 0z" /></svg>;
const IconPencil = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>;
const IconTrash = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;
const IconX = (props: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={props.className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const IconMagicWand = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v1.046a1 1 0 01-1.447.894l-.849-.424a1 1 0 01-.299-1.211l.245-.978A1 1 0 0111.3 1.046zM6.8 2.553a1 1 0 011.211.299l.424.849a1 1 0 01-.894 1.447L6.5 4.102a1 1 0 01-1.211-.299l-.245-.978a1 1 0 011.255-1.272zM2.553 6.8a1 1 0 01.299-1.211l.978-.245a1 1 0 011.272 1.255l-.424.849a1 1 0 01-1.447.894L2.502 6.5a1 1 0 01.051-1.299zM1.046 11.3a1 1 0 011.046-1 1 1 0 01.894 1.447l-.424.849a1 1 0 01-1.211.299l-.978-.245a1 1 0 01.255-1.272zM4.102 14.5a1 1 0 01.894-1.447l.849.424a1 1 0 01.299 1.211l-.245.978a1 1 0 01-1.255 1.272l-.978-.245a1 1 0 01-.299-1.211zM8.148 15.852a1 1 0 011.106-1.106l5-5a1 1 0 011.414 1.414l-5 5a1 1 0 01-1.414 0l-.106-.106z" clipRule="evenodd" /><path d="M10.293 6.293a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414z" /></svg>;
const IconPlus = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>;
const IconImage = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const IconChart = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const IconTable = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7-8v8m14-8v8M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>;
const IconChat = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>;
const IconSend = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>;


interface Props {
    appState: AppState;
    onDraftComplete: (draft: string) => void;
    onImageGenerated: (url: string) => void;
}

const TOOLBAR_ACTIONS = [
    { name: 'Shorten', icon: <IconScissors /> },
    { name: 'Formalize', icon: <IconBriefcase /> },
    { name: 'Elaborate', icon: <IconArrowsExpand /> },
];

// Shortened steps to sync with faster streaming
const DRAFTING_STEPS = [
    "Drafting content...",
    "Finalizing format & E-E-A-T..."
];

type Block = { id: string; content: string };

const ArticleDrafting: React.FC<Props> = ({ appState, onDraftComplete, onImageGenerated }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isReviewing, setIsReviewing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [title, setTitle] = useState<string>('');
    const [blocks, setBlocks] = useState<Block[]>([]);
    const [isTransforming, setIsTransforming] = useState<string | null>(null); // holds block ID
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
    const [editingContent, setEditingContent] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    const [headerImageLoading, setHeaderImageLoading] = useState(false);
    const [toc, setToc] = useState<{ level: number; text: string; id: string }[]>([]);
    const [placeholderStates, setPlaceholderStates] = useState<Record<string, { isLoading: boolean; error?: string }>>({});

    const [isEditingPrompt, setIsEditingPrompt] = useState(false);
    const [imagePrompt, setImagePrompt] = useState('');

    const [editingImage, setEditingImage] = useState<{ blockId: string; imageUrl: string; altText: string; } | null>(null);
    const [imageEditPrompt, setImageEditPrompt] = useState('');
    const [isEditingImageLoading, setIsEditingImageLoading] = useState(false);
    
    // Insert State
    const [hoverInsertId, setHoverInsertId] = useState<string | null>(null);
    const [isInserting, setIsInserting] = useState<string | null>(null); // holds block ID where insertion happens

    // Chat State
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'model', text: string }[]>([
        { role: 'model', text: 'Hi! I am your AI editor. I can help you rewrite the article, find data, or make global changes. How can I help?' }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);

    useEffect(() => {
        const defaultImagePrompt = `Create a unique and authentic-looking blog header image for an article about '${appState.topic}'. Avoid generic stock photo styles. The image should be professional, engaging, and relevant to the topic.`;
        setImagePrompt(defaultImagePrompt);

        if (!appState.imageUrl && appState.topic) {
            setHeaderImageLoading(true);
            generateArticleImage(defaultImagePrompt)
                .then(url => onImageGenerated(url))
                .catch((err: any) => setError(err.message || 'Failed to generate header image.'))
                .finally(() => setHeaderImageLoading(false));
        }
    }, [appState.topic, appState.imageUrl, onImageGenerated]);

    // Robust splitting logic to handle tables and code blocks correctly
    const splitContentToBlocks = (text: string): Block[] => {
        const blocks: Block[] = [];
        const lines = text.split('\n');
        let currentBlockContent: string[] = [];
        let inCodeBlock = false;
        let inTable = false;
        
        const pushBlock = () => {
            if (currentBlockContent.length > 0) {
                // Join lines and check if it's just empty space
                const content = currentBlockContent.join('\n');
                if (content.trim()) {
                    blocks.push({ id: `block-${blocks.length}-${Date.now()}`, content: content.trim() });
                }
                currentBlockContent = [];
            }
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            // Code Block Detection
            if (trimmed.startsWith('```')) {
                if (inCodeBlock) {
                    // Closing block
                    currentBlockContent.push(line);
                    pushBlock();
                    inCodeBlock = false;
                    continue;
                } else {
                    // Opening block
                    if (currentBlockContent.length > 0) pushBlock(); // split previous content
                    inCodeBlock = true;
                    currentBlockContent.push(line);
                    continue;
                }
            }

            if (inCodeBlock) {
                currentBlockContent.push(line);
                continue;
            }

            // Table Detection
            const isTableLine = trimmed.startsWith('|');
            if (isTableLine) {
                if (!inTable) {
                    if (currentBlockContent.length > 0) pushBlock();
                    inTable = true;
                }
                currentBlockContent.push(line);
                continue;
            } else if (inTable && trimmed === '') {
                // End of table via newline
                pushBlock();
                inTable = false;
                continue;
            } else if (inTable) {
                 // Sometimes table lines don't start with pipe but are part of it? Unlikely in strict MD, but safe to break if not pipe.
                 // Actually, assume it's not table if not pipe and non-empty
                 pushBlock();
                 inTable = false;
                 currentBlockContent.push(line);
                 continue;
            }

            // Normal Text Logic
            // If it's an empty line, we usually split blocks
            if (trimmed === '') {
                pushBlock();
            } else {
                // Headers usually start new blocks
                if (trimmed.startsWith('#') && currentBlockContent.length > 0) {
                     pushBlock();
                }
                currentBlockContent.push(line);
            }
        }
        pushBlock(); // Push remaining content
        return blocks;
    };

    useEffect(() => {
        const generate = async () => {
            if (!appState.topic || appState.outline.length === 0) return;
            
            try {
                // Step 1: Generation
                const textPrompt = `Write a comprehensive, engaging, and GEO-optimized blog post about '${appState.topic}'. Follow this outline exactly:\n- ${appState.outline.join('\n- ')}`;
                const stream = await generateLongFormContent(textPrompt, appState.internalLinks);
                let fullDraft = '';
                let firstChunkReceived = false;
                
                for await (const chunk of stream) {
                    if (!firstChunkReceived) {
                        setIsLoading(false); // Hide loader, show content area
                        firstChunkReceived = true;
                    }
                    fullDraft += chunk.text;
                    // Simple split for live preview
                    setBlocks([{ id: 'preview', content: fullDraft }]);
                }
                 
                // If no content, exit.
                if (!firstChunkReceived) {
                    setIsLoading(false);
                    setBlocks([{ id: 'block-0', content: 'The AI could not generate content for this topic. Please try again.' }]);
                    return;
                }

                // Step 2: Review (Once complete)
                setIsReviewing(true);
                const cleanedDraft = await reviewArticle(fullDraft);
                
                // Step 3: Final Processing
                let finalBlocks = splitContentToBlocks(cleanedDraft);

                // Extract title
                const titleIndex = finalBlocks.findIndex(b => b.content.trim().startsWith('# '));
                if (titleIndex > -1) {
                    const titleBlock = finalBlocks[titleIndex];
                    const newTitle = titleBlock.content.replace(/^#\s*/, '').trim();
                    setTitle(newTitle);
                    finalBlocks.splice(titleIndex, 1);
                }
                
                setBlocks(finalBlocks);

                const contentForToc = finalBlocks.map(b => b.content).join('\n\n');
                const headingRegex = /^(#{2,6})\s*(.*)/gm;
                const matches = [...contentForToc.matchAll(headingRegex)];
                const newToc = matches.map(match => {
                    const level = match[1].length;
                    const text = match[2].trim();
                    const id = text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-');
                    return { level, text, id };
                });
                setToc(newToc);

            } catch (err: any) {
                setError(err.message || "An unknown error occurred during drafting.");
                setIsLoading(false);
            } finally {
                setIsReviewing(false);
            }
        };
        generate();
    }, [appState.topic, appState.outline, appState.internalLinks]);

     useEffect(() => {
        if (editingBlockId && textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [editingContent, editingBlockId]);

    const handleGenerateInlineImage = async (blockId: string, prompt: string) => {
        setPlaceholderStates(prev => ({ ...prev, [blockId]: { isLoading: true } }));
        setError(null);
        try {
            const imageUrl = await generateArticleImage(prompt);
            // Sanitize prompt to ensure it fits on one line for markdown alt text validity
            const sanitizedPrompt = prompt.replace(/[\r\n]+/g, ' ').trim();
            const newContent = `![${sanitizedPrompt}](${imageUrl})`;
            setBlocks(prevBlocks => 
                prevBlocks.map(b => b.id === blockId ? { ...b, content: newContent } : b)
            );
        } catch (err: any) {
            setError(`Failed to generate image for "${prompt}": ${err.message}`);
            setPlaceholderStates(prev => ({ ...prev, [blockId]: { isLoading: false, error: err.message } }));
        }
    };

    const handleTransform = async (action: string, targetBlockId: string) => {
        const targetBlock = blocks.find(b => b.id === targetBlockId);
        if (!action || !targetBlock) return;

        setIsTransforming(targetBlockId);
        setSelectedBlockId(null);
        setError(null);

        try {
            const transformedText = await transformText(targetBlock.content, action, appState.language);
            setBlocks(currentBlocks => 
                currentBlocks.map(b => b.id === targetBlockId ? { ...b, content: transformedText } : b)
            );
        } catch (err: any) {
            setError(err.message || `Failed to perform action: ${action}`);
        } finally {
            setIsTransforming(null);
        }
    };

    const handleEdit = (block: Block) => {
        setSelectedBlockId(null);
        setEditingBlockId(block.id);
        setEditingContent(block.content);
    };

    const handleSaveEdit = () => {
        if (!editingBlockId) return;
        setBlocks(blocks.map(b => b.id === editingBlockId ? { ...b, content: editingContent } : b));
        setEditingBlockId(null);
        setEditingContent('');
    };
    
    const handleDelete = (targetBlockId: string) => {
        setBlocks(blocks.filter(b => b.id !== targetBlockId));
        setSelectedBlockId(null);
    };
    
    const handleContinue = () => {
        const finalDraft = `# ${title}\n\n${blocks.map(b => b.content).join('\n\n')}`;
        onDraftComplete(finalDraft);
    };
    
    const handleRegenerateImage = async () => {
        if (!imagePrompt) return;
        setHeaderImageLoading(true);
        setError(null);
        try {
            const url = await generateArticleImage(imagePrompt);
            onImageGenerated(url);
            setIsEditingPrompt(false);
        } catch (err: any) { setError(err.message || 'Failed to regenerate image.'); } 
        finally { setHeaderImageLoading(false); }
    };

    const handleApplyImageEdit = async () => {
        if (!editingImage || !imageEditPrompt.trim()) return;
        setIsEditingImageLoading(true);
        setError(null);
        try {
            const dataUrlRegex = /^data:(image\/[a-zA-Z]+);base64,(.*)$/;
            const match = editingImage.imageUrl.match(dataUrlRegex);
            if (!match) throw new Error("Invalid image data URL format.");
            
            const [, mimeType, base64Data] = match;
            const newImageUrl = await editArticleImage(base64Data, mimeType, imageEditPrompt);

            if (editingImage.blockId === 'header') {
                onImageGenerated(newImageUrl);
            } else {
                const newContent = `![${editingImage.altText}](${newImageUrl})`;
                setBlocks(prevBlocks => 
                    prevBlocks.map(b => b.id === editingImage.blockId ? { ...b, content: newContent } : b)
                );
            }
            setEditingImage(prev => prev ? { ...prev, imageUrl: newImageUrl } : null);
            setImageEditPrompt('');
        } catch (err: any) {
            setError(err.message || "Failed to apply image edit.");
        } finally {
            setIsEditingImageLoading(false);
        }
    };

    const handleInsertContent = async (index: number, type: 'TEXT' | 'IMAGE' | 'GRAPH' | 'TABLE') => {
        setIsInserting(`idx-${index}`);
        setError(null);
        try {
            // Get context
            const prevContext = blocks.slice(Math.max(0, index - 2), index).map(b => b.content).join('\n');
            const nextContext = blocks.slice(index, Math.min(blocks.length, index + 2)).map(b => b.content).join('\n');
            
            const newContent = await generateContextualAddition(prevContext, nextContext, type);
            
            const newBlock: Block = {
                id: `inserted-${Date.now()}`,
                content: newContent
            };
            
            const newBlocks = [...blocks];
            newBlocks.splice(index, 0, newBlock);
            setBlocks(newBlocks);

        } catch (err: any) {
            setError(err.message || "Failed to insert content.");
        } finally {
            setIsInserting(null);
            setHoverInsertId(null);
        }
    };

    const handleChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        const userMsg = chatInput;
        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsChatLoading(true);

        try {
            const fullDraft = `# ${title}\n\n${blocks.map(b => b.content).join('\n\n')}`;
            const response = await chatWithDraft(fullDraft, chatMessages, userMsg, appState);
            setChatMessages(prev => [...prev, { role: 'model', text: response }]);
        } catch (err) {
            setChatMessages(prev => [...prev, { role: 'model', text: "Sorry, I couldn't process that request." }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    // Updated regex to be more permissive with alt text (newlines) and mime types
    const imageMarkdownRegex = /!\[([\s\S]*?)\]\((data:image\/[^;]+;base64,[^)]+)\)/;

    return (
        <div className="h-full flex flex-col relative">
            <header className="mb-6 flex-shrink-0">
                <h2 className="text-3xl font-bold text-slate-100">Step 3: Drafting Studio</h2>
                <p className="text-slate-400 mt-2">
                    {isLoading ? 'The AI is writing your article (Inverted Pyramid Model)...' : isReviewing ? 'AI is reviewing format and GEO compliance...' : 'Click on a paragraph to reveal editing options. Hover between blocks to insert new content.'}
                </p>
            </header>
            
            {error && <div className="text-red-400 bg-red-900/50 p-4 rounded-lg mb-4">{error}</div>}

            <main className="flex-grow overflow-y-auto pr-2 bg-slate-800/20 rounded-lg p-2 pt-12 flex flex-col">
                {isLoading && (
                    <div className="flex items-center justify-center h-full">
                        <ThinkingProcess messages={DRAFTING_STEPS} />
                    </div>
                )}
                
                {!isLoading && (
                  <>
                    <div className="relative group mb-6">
                        {headerImageLoading && (
                            <div className="w-full aspect-video flex items-center justify-center bg-slate-900/50 rounded-md border-2 border-dashed border-slate-700">
                                <Loader message="Generating header image..." />
                            </div>
                        )}
                        {!headerImageLoading && appState.imageUrl && (
                             <div className="relative group w-full aspect-video rounded-lg overflow-hidden shadow-xl border border-slate-700/50">
                                <img src={appState.imageUrl} alt={appState.topic} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white font-semibold rounded-md gap-4">
                                    <button onClick={() => setIsEditingPrompt(true)} className="flex items-center gap-2 p-2 rounded-md hover:bg-black/30">
                                        <IconPencil /> <span>Change Prompt</span>
                                    </button>
                                    <button onClick={() => setEditingImage({ blockId: 'header', imageUrl: appState.imageUrl, altText: appState.topic })} className="flex items-center gap-2 p-2 rounded-md hover:bg-black/30">
                                        <IconMagicWand /> <span>Edit Image</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {title && (
                        <div className="my-6 bg-slate-900/50 p-6 rounded-lg shadow-md animate-fade-in">
                            <h1 className="text-4xl font-extrabold text-center text-slate-100 tracking-tight">{title}</h1>
                        </div>
                    )}

                    {toc.length > 0 && (
                        <div className="mb-6 bg-slate-800/50 p-4 rounded-lg">
                            <h3 className="font-semibold text-indigo-400 mb-2">Table of Contents</h3>
                            <ul className="space-y-1">
                                {toc.map(item => (
                                    <li key={item.id} style={{ marginLeft: `${(item.level - 2) * 1}rem` }}>
                                        <a href={`#${item.id}`} className="text-slate-300 hover:text-indigo-400 text-sm transition-colors">{item.text}</a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    
                    <div>
                        {blocks.map((block, index) => {
                            const isPreview = block.id === 'preview';
                            const placeholderMatch = block.content.match(/\[(IMAGE|GRAPH):\s*([^\]]+)\]/);
                            const imageMatch = block.content.match(imageMarkdownRegex);
                            const placeholderState = placeholderStates[block.id];

                            // Insert Divider logic
                            const showInsert = !isPreview && !isLoading;
                            const insertLoading = isInserting === `idx-${index}`;
                            const isSelected = selectedBlockId === block.id;

                            return (
                                <React.Fragment key={block.id}>
                                    {/* Insertion Divider BEFORE the block */}
                                    {showInsert && (
                                        <div 
                                            className={`relative flex items-center justify-center group/insert transition-all duration-300 ${insertLoading ? 'h-16' : 'h-8'}`}
                                            style={{ zIndex: 50 }}
                                            onMouseEnter={() => setHoverInsertId(block.id)}
                                            onMouseLeave={() => setHoverInsertId(null)}
                                        >
                                            {insertLoading ? <Loader message="Generating..." /> : (
                                                <div className={`absolute z-50 flex gap-2 bg-slate-800 shadow-xl rounded-full px-4 py-2 border border-slate-600 transition-all duration-200 ${hoverInsertId === block.id ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}>
                                                    <button onClick={() => handleInsertContent(index, 'TEXT')} className="flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-indigo-400"><IconPencil /> Text</button>
                                                    <div className="w-px h-4 bg-slate-600 self-center"></div>
                                                    <button onClick={() => handleInsertContent(index, 'IMAGE')} className="flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-indigo-400"><IconImage /> Image</button>
                                                    <div className="w-px h-4 bg-slate-600 self-center"></div>
                                                    <button onClick={() => handleInsertContent(index, 'GRAPH')} className="flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-indigo-400"><IconChart /> Graph</button>
                                                    <div className="w-px h-4 bg-slate-600 self-center"></div>
                                                    <button onClick={() => handleInsertContent(index, 'TABLE')} className="flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-indigo-400"><IconTable /> Table</button>
                                                </div>
                                            )}
                                            <div className={`w-full h-0.5 bg-indigo-500/50 transition-all ${hoverInsertId === block.id ? 'w-full opacity-100' : 'w-0 opacity-0'}`}></div>
                                        </div>
                                    )}

                                    {/* Block Content */}
                                    {(() => {
                                        if (isPreview) {
                                            return (
                                                <div className="p-2 my-4 rounded-md opacity-70">
                                                    <MarkdownRenderer content={block.content} />
                                                </div>
                                            )
                                        }

                                        if (imageMatch) {
                                            const [, altText, imageUrl] = imageMatch;
                                            return (
                                                <div className="relative group my-8 not-prose">
                                                    <img src={imageUrl} alt={altText} className="rounded-lg shadow-lg max-w-full h-auto mx-auto" />
                                                    <button 
                                                        onClick={() => setEditingImage({ blockId: block.id, imageUrl, altText })}
                                                        className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white font-semibold rounded-md cursor-pointer"
                                                    >
                                                        <IconMagicWand /> <span className="ml-2">Edit with AI</span>
                                                    </button>
                                                </div>
                                            );
                                        }

                                        if (placeholderMatch && !placeholderState?.error) {
                                            return (
                                                <div className="my-8 p-4 bg-slate-700/50 border-l-4 border-indigo-400 rounded-r-lg not-prose relative group/placeholder">
                                                     <button 
                                                        onClick={() => handleDelete(block.id)}
                                                        className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800/50 rounded-full transition-all opacity-0 group-hover/placeholder:opacity-100"
                                                        title="Delete placeholder"
                                                    >
                                                        <IconX className="h-4 w-4" />
                                                    </button>
                                                    <p className="font-semibold text-indigo-300 text-sm">
                                                        {placeholderMatch[1] === 'IMAGE' ? 'Image Generation' : 'Graph Generation'}
                                                    </p>
                                                    <p className="text-slate-300 text-sm italic my-2">"{placeholderMatch[2]}"</p>
                                                    <button
                                                        onClick={() => handleGenerateInlineImage(block.id, placeholderMatch[2])}
                                                        disabled={placeholderState?.isLoading}
                                                        className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-md font-semibold hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        {placeholderState?.isLoading ? 'Generating...' : 'Generate'}
                                                    </button>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className={`relative group rounded-xl p-2 transition-all my-4 ${isSelected ? 'z-50 scale-[1.01] shadow-2xl bg-slate-800/60 ring-1 ring-indigo-500/50' : 'z-10'}`}>
                                                <GlowingEffect
                                                    spread={40}
                                                    glow={true}
                                                    disabled={false}
                                                    proximity={64}
                                                    inactiveZone={0.01}
                                                    borderWidth={2}
                                                />
                                                
                                                <div className="relative z-10">
                                                    {isSelected && !editingBlockId && (
                                                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-[100] p-1 flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-max max-w-[90vw]">
                                                            {TOOLBAR_ACTIONS.map(({ name, icon }) => (
                                                                <button key={name} onClick={() => handleTransform(name, block.id)} className="flex items-center px-3 py-2 text-xs font-semibold bg-slate-800 text-slate-200 rounded-md hover:bg-slate-700 active:bg-slate-600 transition-colors whitespace-nowrap border border-slate-700/50">
                                                                    {icon} {name}
                                                                </button>
                                                            ))}
                                                            <button onClick={() => handleEdit(block)} className="flex items-center px-3 py-2 text-xs font-semibold bg-slate-800 text-slate-200 rounded-md hover:bg-slate-700 active:bg-slate-600 transition-colors whitespace-nowrap border border-slate-700/50"><IconPencil /> Edit</button>
                                                            <button onClick={() => handleDelete(block.id)} className="flex items-center px-3 py-2 text-xs font-semibold text-red-400 bg-slate-800 rounded-md hover:bg-red-900/30 active:bg-red-800/30 transition-colors whitespace-nowrap border border-slate-700/50"><IconTrash /> Delete</button>
                                                            
                                                            {/* Arrow pointing down */}
                                                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 border-b border-r border-slate-700 transform rotate-45"></div>
                                                        </div>
                                                    )}
                                                    {editingBlockId === block.id ? (
                                                        <div className="bg-slate-800 p-2 rounded-md ring-2 ring-indigo-500 z-50 relative">
                                                            <textarea
                                                                ref={textareaRef}
                                                                value={editingContent}
                                                                onChange={(e) => setEditingContent(e.target.value)}
                                                                className="w-full bg-slate-900 text-slate-200 p-2 border-0 rounded-md outline-none resize-none overflow-hidden"
                                                            />
                                                            <div className="flex justify-end gap-2 mt-2">
                                                                <button onClick={() => setEditingBlockId(null)} className="px-3 py-1 text-xs font-semibold bg-slate-600 rounded-md hover:bg-slate-500">Cancel</button>
                                                                <button onClick={handleSaveEdit} className="px-3 py-1 text-xs font-semibold bg-indigo-600 rounded-md hover:bg-indigo-700">Save</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div
                                                            onClick={() => setSelectedBlockId(isSelected ? null : block.id)}
                                                            className={`p-2 rounded-md transition-all duration-200 cursor-pointer ${
                                                                isSelected ? '' : 'hover:bg-slate-800/20'
                                                            } ${isTransforming === block.id ? 'opacity-50 animate-pulse' : ''}`}
                                                        >
                                                            <MarkdownRenderer content={block.content} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </React.Fragment>
                            );
                        })}
                        
                        {/* Final Divider at bottom */}
                         {!isLoading && (
                            <div 
                                className={`relative flex items-center justify-center group/insert transition-all duration-300 ${isInserting === `idx-${blocks.length}` ? 'h-16' : 'h-8'}`}
                                style={{ zIndex: 40 }}
                                onMouseEnter={() => setHoverInsertId('end')}
                                onMouseLeave={() => setHoverInsertId(null)}
                            >
                                {isInserting === `idx-${blocks.length}` ? <Loader message="Generating..." /> : (
                                    <div className={`absolute z-20 flex gap-2 bg-slate-800 shadow-xl rounded-full px-4 py-2 border border-slate-600 transition-all duration-200 ${hoverInsertId === 'end' ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}>
                                        <button onClick={() => handleInsertContent(blocks.length, 'TEXT')} className="flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-indigo-400"><IconPencil /> Text</button>
                                        <div className="w-px h-4 bg-slate-600 self-center"></div>
                                        <button onClick={() => handleInsertContent(blocks.length, 'IMAGE')} className="flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-indigo-400"><IconImage /> Image</button>
                                        <div className="w-px h-4 bg-slate-600 self-center"></div>
                                        <button onClick={() => handleInsertContent(blocks.length, 'GRAPH')} className="flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-indigo-400"><IconChart /> Graph</button>
                                        <div className="w-px h-4 bg-slate-600 self-center"></div>
                                        <button onClick={() => handleInsertContent(blocks.length, 'TABLE')} className="flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-indigo-400"><IconTable /> Table</button>
                                    </div>
                                )}
                                <div className={`w-full h-0.5 bg-indigo-500/50 transition-all ${hoverInsertId === 'end' ? 'w-full opacity-100' : 'w-0 opacity-0'}`}></div>
                            </div>
                         )}
                    </div>
                  </>
                )}
            </main>

            <footer className="flex-shrink-0 pt-6 flex justify-between items-center relative">
                <button onClick={() => setIsChatOpen(!isChatOpen)} className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-full font-semibold hover:bg-slate-600 border border-slate-500 shadow-lg">
                   <IconChat /> {isChatOpen ? 'Hide Assistant' : 'AI Editor Assistant'}
                </button>

                <button onClick={handleContinue} disabled={isLoading || isReviewing || isTransforming !== null || editingBlockId !== null} className="px-8 py-3 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors">
                    Finalize & Publish
                </button>
            </footer>

            {/* Chat Panel */}
            {isChatOpen && (
                <div className="absolute bottom-20 left-0 w-full md:w-96 h-[500px] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl flex flex-col z-30 animate-fade-in">
                    <header className="p-3 bg-slate-800 rounded-t-lg border-b border-slate-700 flex justify-between items-center">
                        <h3 className="font-bold text-slate-100 flex items-center gap-2"><IconChat/> AI Editor</h3>
                        <button onClick={() => setIsChatOpen(false)} className="hover:text-white text-slate-400"><IconX /></button>
                    </header>
                    <div className="flex-grow overflow-y-auto p-4 space-y-4">
                        {chatMessages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-200'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isChatLoading && <div className="text-slate-400 text-xs italic ml-2">AI is typing...</div>}
                    </div>
                    <form onSubmit={handleChatSubmit} className="p-3 border-t border-slate-700 flex gap-2 bg-slate-800 rounded-b-lg">
                        <input 
                            type="text" 
                            value={chatInput} 
                            onChange={(e) => setChatInput(e.target.value)} 
                            placeholder="Ask for changes or data..." 
                            className="flex-grow bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500"
                        />
                        <button type="submit" disabled={!chatInput.trim() || isChatLoading} className="bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 disabled:opacity-50">
                            <IconSend />
                        </button>
                    </form>
                </div>
            )}


            {/* Modals for Image Editing (Existing) */}
            {isEditingPrompt && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl w-full max-w-2xl flex flex-col">
                        <header className="p-4 border-b border-slate-700 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-indigo-400">Edit Image Prompt</h3>
                            <button onClick={() => setIsEditingPrompt(false)} className="p-2 rounded-full hover:bg-slate-700"><IconX /></button>
                        </header>
                        <div className="p-4 flex-grow">
                            <label htmlFor="imagePrompt" className="block text-sm font-medium text-slate-300 mb-2">Prompt</label>
                            <textarea id="imagePrompt" value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} placeholder="Describe the image you want to generate..." rows={4} className="w-full bg-slate-900/70 p-3 border border-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none resize-y" />
                        </div>
                        <footer className="p-4 border-t border-slate-700 flex justify-end gap-4">
                            <button onClick={() => setIsEditingPrompt(false)} disabled={headerImageLoading} className="px-4 py-2 bg-slate-600 text-white rounded-md font-semibold hover:bg-slate-500 disabled:bg-slate-500">Cancel</button>
                            <button onClick={handleRegenerateImage} disabled={headerImageLoading || !imagePrompt.trim()} className="px-6 py-2 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed">
                                {headerImageLoading ? 'Generating...' : 'Regenerate Image'}
                            </button>
                        </footer>
                    </div>
                </div>
            )}

            {editingImage && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl w-full max-w-2xl flex flex-col">
                        <header className="p-4 border-b border-slate-700 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-indigo-400">Edit Image with AI</h3>
                            <button onClick={() => setEditingImage(null)} className="p-2 rounded-full hover:bg-slate-700"><IconX /></button>
                        </header>
                        <div className="p-4 flex-grow flex flex-col gap-4 items-center">
                            <div className="relative w-full max-w-lg">
                                <img src={editingImage.imageUrl} alt="Image to edit" className="rounded-md w-full" />
                                {isEditingImageLoading && (
                                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-md">
                                        <Loader message="Applying edit..." />
                                    </div>
                                )}
                            </div>
                            <div className="w-full max-w-lg flex gap-2">
                                <input 
                                    type="text"
                                    value={imageEditPrompt}
                                    onChange={(e) => setImageEditPrompt(e.target.value)}
                                    placeholder="e.g., 'make it a watercolor painting'"
                                    className="w-full px-4 py-2 bg-slate-900/70 border border-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                                    disabled={isEditingImageLoading}
                                    onKeyDown={(e) => e.key === 'Enter' && handleApplyImageEdit()}
                                />
                                <button 
                                    onClick={handleApplyImageEdit} 
                                    disabled={isEditingImageLoading || !imageEditPrompt.trim()} 
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed"
                                >
                                    {isEditingImageLoading ? 'Applying...' : 'Apply'}
                                </button>
                            </div>
                            {error && <p className="text-red-400 text-sm self-start w-full max-w-lg">{error}</p>}
                        </div>
                        <footer className="p-4 border-t border-slate-700 flex justify-end">
                            <button onClick={() => setEditingImage(null)} disabled={isEditingImageLoading} className="px-4 py-2 bg-slate-600 text-white rounded-md font-semibold hover:bg-slate-500">
                                Done
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ArticleDrafting;
