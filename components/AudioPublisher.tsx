
import React, { useState, useRef, useEffect } from 'react';
import { generateSpeech, generateSocialPosts, regenerateTitle } from '../services/gemini';
import { AppState } from '../types';
import { decode, decodeAudioData } from '../utils/helpers';
import Loader from './Loader';
import MarkdownComponent, { MarkdownProcessor } from './MarkdownRenderer';


// Icons
const IconPencil = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>;
const IconSparkles = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293a1 1 0 010 1.414L10 12l-2.293-2.293a1 1 0 010-1.414L10 6z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconX = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const IconLock = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>;
const IconChevronDown = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;


interface Props {
    appState: AppState;
    onRestart: () => void;
    onImageGenerated: (url: string) => void;
}

const VOICES = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'];

const CopyButton = ({ text }: { text: string }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button onClick={handleCopy} className="text-xs bg-slate-600 hover:bg-slate-500 px-2 py-1 rounded-md transition-colors z-20 relative">
            {copied ? 'Copied!' : 'Copy'}
        </button>
    );
};

const SocialPostAccordionItem: React.FC<{ platform: string, content: string }> = ({ platform, content }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <div className="bg-slate-900/50 rounded-md overflow-hidden border border-slate-700/50">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-3 hover:bg-slate-800/50 transition-colors text-left"
            >
                <span className="font-semibold capitalize text-slate-300 flex items-center gap-2">
                    {platform}
                </span>
                <div className="flex items-center gap-3">
                    {isOpen && <CopyButton text={content} />}
                    <IconChevronDown className={`transition-transform duration-200 text-slate-500 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>
            
            {isOpen && (
                <div className="p-3 border-t border-slate-700/50 bg-slate-900/30 animate-fade-in">
                    <p className="text-sm text-slate-400 whitespace-pre-wrap leading-relaxed">{content}</p>
                </div>
            )}
        </div>
    );
};

const Publish: React.FC<Props> = ({ appState, onRestart, onImageGenerated }) => {
    const [selectedVoice, setSelectedVoice] = useState(VOICES[0]);
    const [audioLoading, setAudioLoading] = useState(false);
    const [socialLoading, setSocialLoading] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [socialPosts, setSocialPosts] = useState<Record<string, string> | null>(null);
    const [error, setError] = useState<string | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    const [title, setTitle] = useState('');
    const [articleBody, setArticleBody] = useState('');
    const [toc, setToc] = useState<{ level: number; text: string; id: string }[]>([]);

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editableTitle, setEditableTitle] = useState('');
    const [isRegeneratingTitle, setIsRegeneratingTitle] = useState(false);

    const [isPublishing, setIsPublishing] = useState(false);
    const [publishSuccess, setPublishSuccess] = useState(false);

    useEffect(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }

        const fullDraft = appState.draft;
        const lines = fullDraft.split('\n');
        const titleIndex = lines.findIndex(line => line.trim().startsWith('# '));
        
        let body = fullDraft;
        let newTitle = appState.topic;

        if (titleIndex > -1) {
            newTitle = lines[titleIndex].replace(/^#\s*/, '').trim();
            body = lines.slice(titleIndex + 1).join('\n').trim();
        }
        
        setTitle(newTitle);
        setArticleBody(body);

        const headingRegex = /^(#{2,6})\s(.*)/gm;
        const matches = [...body.matchAll(headingRegex)];
        const newToc = matches.map(match => ({
            level: match[1].length,
            text: match[2].trim(),
            id: match[2].toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-')
        }));
        setToc(newToc);

        const currentAudioContext = audioContextRef.current;
        return () => { currentAudioContext?.close(); };
    }, [appState.draft, appState.topic]);

    const handleEditTitle = () => {
        setEditableTitle(title);
        setIsEditingTitle(true);
    };

    const handleSaveTitle = () => {
        setTitle(editableTitle);
        setIsEditingTitle(false);
    };
    
    const handleRegenerateTitle = async () => {
        setIsRegeneratingTitle(true);
        setError(null);
        try {
            const newTitle = await regenerateTitle(articleBody);
            setEditableTitle(newTitle);
        } catch (err: any) { setError(err.message || 'Failed to regenerate title.'); } 
        finally { setIsRegeneratingTitle(false); }
    };

    const bufferToWave = (abuffer: AudioBuffer): Blob => {
        const numOfChan = abuffer.numberOfChannels;
        const length = abuffer.length * numOfChan * 2 + 44;
        const buffer = new ArrayBuffer(length);
        const view = new DataView(buffer);
        const channels = [];
        let i, sample;
        let offset = 0;
        let pos = 0;

        const setUint16 = (data: number) => { view.setUint16(pos, data, true); pos += 2; };
        const setUint32 = (data: number) => { view.setUint32(pos, data, true); pos += 4; };

        setUint32(0x46464952); // "RIFF"
        setUint32(length - 8); // file length
        setUint32(0x45564157); // "WAVE"
        setUint32(0x20746d66); // "fmt " chunk
        setUint32(16); // length = 16
        setUint16(1); // PCM (uncompressed)
        setUint16(numOfChan); // num of channels
        setUint32(abuffer.sampleRate); // sample rate
        setUint32(abuffer.sampleRate * 2 * numOfChan); // byte rate
        setUint16(numOfChan * 2); // block align
        setUint16(16); // bits per sample
        setUint32(0x61746164); // "data" chunk
        setUint32(length - pos - 4); // length of data

        for (i = 0; i < abuffer.numberOfChannels; i++) channels.push(abuffer.getChannelData(i));

        while (pos < length) {
            for (i = 0; i < numOfChan; i++) {
                sample = Math.max(-1, Math.min(1, channels[i][offset]));
                sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
                view.setInt16(pos, sample, true);
                pos += 2;
            }
            offset++;
        }
        return new Blob([buffer], { type: "audio/wav" });
    };

    const handleGenerateAudio = async () => {
        setAudioLoading(true);
        setError(null);
        setAudioUrl(null);
        try {
            const textToSpeak = `${title}. ${articleBody.replace(/#{1,6}\s/g, '').replace(/!\[.*?\]\(.*?\)/g, '').replace(/\[(IMAGE|GRAPH):.*?\]/g, '')}`;
            const base64Audio = await generateSpeech(textToSpeak.substring(0, 4000), selectedVoice);
            
            if (!audioContextRef.current) throw new Error("Audio context not initialized.");

            const audioData = decode(base64Audio);
            const audioBuffer = await decodeAudioData(audioData, audioContextRef.current, 24000, 1);

            const waveBlob = bufferToWave(audioBuffer);
            const url = URL.createObjectURL(waveBlob);
            setAudioUrl(url);

        } catch (err: any) {
            setError(err.message || "Failed to generate audio.");
        } finally {
            setAudioLoading(false);
        }
    };
    
    const handleGenerateSocial = async () => {
        setSocialLoading(true);
        setError(null);
        setSocialPosts(null);
        try {
            const textToSummarize = `${title}. ${articleBody.substring(0, 2000)}`;
            const posts = await generateSocialPosts(textToSummarize);
            setSocialPosts(posts);
        } catch (err: any) {
            setError(err.message || "Failed to generate social posts.");
        } finally {
            setSocialLoading(false);
        }
    };

    const handleDownload = () => {
        const renderedBody = articleBody.split(/\n{2,}/).map(block => new MarkdownProcessor({ content: block }).renderToHtml()).join('');

        const content = `
            <html>
                <head>
                    <title>${title}</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 800px; margin: 40px auto; padding: 0 20px; }
                        img { max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 2em; }
                        h1 { font-size: 2.8em; margin-bottom: 0.5em; line-height: 1.2; }
                        h2 { font-size: 2em; margin-top: 2em; border-bottom: 1px solid #eee; padding-bottom: 0.3em;}
                        h3 { font-size: 1.5em; margin-top: 1.5em; }
                        p { margin-bottom: 1em; }
                        ul, ol { padding-left: 2em; }
                        blockquote { border-left: 3px solid #ccc; padding-left: 1em; margin-left: 0; color: #666; }
                        table { border-collapse: collapse; width: 100%; margin: 1em 0; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                        @media print {
                            body { margin: 0; }
                            .container { max-width: 100%; margin: 20px; border: none; box-shadow: none; }
                            h2 { border: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        ${appState.imageUrl ? `<img src="${appState.imageUrl}" alt="${title}" />` : ''}
                        <h1>${title}</h1>
                        ${renderedBody}
                    </div>
                </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(content);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                try {
                    printWindow.print();
                } finally {
                    printWindow.close();
                }
            }, 500);
        }
    };

    return (
        <div className="h-full flex flex-col animate-fade-in">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-slate-100">Step 4: Publish</h2>
                    <p className="text-slate-400 mt-2">Your content is ready. Fine-tune, generate assets, and download your files.</p>
                </div>
                <button onClick={onRestart} className="px-4 py-2 bg-slate-700 text-white rounded-md font-semibold hover:bg-slate-600">Start Over</button>
            </header>
            {error && <div className="text-red-400 bg-red-900/50 p-4 rounded-lg mb-4">{error}</div>}
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-grow overflow-hidden">
                <main className="lg:col-span-2 bg-slate-800/50 rounded-lg p-4 overflow-y-auto">
                    <h3 className="text-xl font-semibold text-indigo-400 mb-4 border-b border-slate-700 pb-2">Final Article Preview</h3>
                    
                    <div className="relative group mb-6">
                        {appState.imageUrl ? (
                             <img src={appState.imageUrl} alt={appState.topic} className="w-full h-64 object-cover rounded-md shadow-lg" />
                        ) : (
                            <div className="w-full h-64 flex items-center justify-center bg-slate-900/50 rounded-md border-2 border-dashed border-slate-700">
                                <p className="text-slate-500">No header image was generated.</p>
                            </div>
                        )}
                    </div>
                    
                    {title && (
                        <div className="my-6 bg-slate-900/50 p-6 rounded-lg shadow-md group relative">
                            {isEditingTitle ? (
                                <div className="flex flex-col gap-4">
                                    <input type="text" value={editableTitle} onChange={(e) => setEditableTitle(e.target.value)} className="w-full bg-slate-800 text-4xl font-extrabold text-center text-slate-100 tracking-tight p-2 rounded-md border border-indigo-500 outline-none" />
                                    <div className="flex justify-center items-center gap-3">
                                        <button onClick={handleSaveTitle} className="px-4 py-2 text-sm font-semibold bg-indigo-600 rounded-md hover:bg-indigo-700">Save</button>
                                        <button onClick={() => setIsEditingTitle(false)} className="px-4 py-2 text-sm font-semibold bg-slate-600 rounded-md hover:bg-slate-500">Cancel</button>
                                        <button onClick={handleRegenerateTitle} disabled={isRegeneratingTitle} className="flex items-center px-4 py-2 text-sm font-semibold bg-slate-700 rounded-md hover:bg-slate-600 disabled:opacity-50">
                                            {isRegeneratingTitle ? 'Generating...' : <><IconSparkles/>Regenerate</>}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <h1 className="text-4xl font-extrabold text-center text-slate-100 tracking-tight">{title}</h1>
                                    <button onClick={handleEditTitle} className="absolute top-2 right-2 p-2 rounded-full bg-slate-700/50 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <IconPencil/>
                                    </button>
                                </>
                            )}
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
                       {articleBody.split(/\n{2,}/).map((block, index) => (
                           <MarkdownComponent key={index} content={block} />
                       ))}
                    </div>
                </main>
                <aside className="flex flex-col gap-6 overflow-y-auto pr-2">
                    <div className="bg-slate-800/50 p-4 rounded-lg">
                        <h3 className="font-semibold text-indigo-400 mb-3">Generate Audio Version</h3>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <label htmlFor="voice-select" className="text-sm font-medium">Voice:</label>
                                <select id="voice-select" value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)} className="bg-slate-700 rounded-md px-2 py-1 text-sm focus:ring-1 focus:ring-indigo-500 outline-none">
                                    {VOICES.map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </div>
                            <button onClick={handleGenerateAudio} disabled={audioLoading} className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700 disabled:bg-slate-600">
                                {audioLoading ? 'Generating Audio...' : 'Generate Audio'}
                            </button>
                            {audioUrl && (
                                <div className="mt-2 animate-fade-in">
                                    <audio controls src={audioUrl} className="w-full"></audio>
                                    <a href={audioUrl} download={`${title.replace(/\s/g, '-')}.wav`} className="block text-center mt-2 text-sm text-indigo-400 hover:underline">
                                        Download WAV
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-800/50 p-4 rounded-lg">
                        <h3 className="font-semibold text-indigo-400 mb-3">Generate Social Posts</h3>
                        <button onClick={handleGenerateSocial} disabled={socialLoading} className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700 disabled:bg-slate-600">
                            {socialLoading ? 'Generating Posts...' : 'Generate Posts'}
                        </button>
                        {socialPosts && (
                            <div className="mt-4 space-y-2 animate-fade-in">
                                {Object.entries(socialPosts).map(([platform, text]) => (
                                    <SocialPostAccordionItem key={platform} platform={platform} content={text as string} />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-800/50 p-4 rounded-lg">
                        <h3 className="font-semibold text-indigo-400 mb-3">Export & Publish</h3>
                        <div className="flex flex-col gap-3">
                            <button onClick={handleDownload} className="w-full px-4 py-2 bg-slate-700 text-white rounded-md font-semibold hover:bg-slate-600">
                                Download as PDF
                            </button>
                            
                            <div className="relative group">
                                <button disabled className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-900/50 text-slate-500 border border-slate-700 rounded-md font-semibold cursor-not-allowed hover:bg-slate-900/50">
                                    <IconLock /> Publish to WordPress <span className="text-xs bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">Coming Soon</span>
                                </button>
                            </div>

                            <div className="relative group">
                                <button disabled className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-900/50 text-slate-500 border border-slate-700 rounded-md font-semibold cursor-not-allowed hover:bg-slate-900/50">
                                    <IconLock /> Publish to Shopify <span className="text-xs bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">Coming Soon</span>
                                </button>
                            </div>
                            
                            {publishSuccess && <p className="text-sm text-center text-green-400 animate-fade-in">Successfully published!</p>}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default Publish;
