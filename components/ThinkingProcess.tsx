
import React, { useState, useEffect } from 'react';

interface Props {
    messages: string[];
}

const IconCheck = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>;

const ThinkingProcess: React.FC<Props> = ({ messages }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        setCurrentIndex(0);
    }, [messages]);

    useEffect(() => {
        if (currentIndex < messages.length - 1) {
            // Randomized timing between 2.5s and 4s for a more natural "thinking" feel
            const time = Math.floor(Math.random() * 1500) + 2500;
            const timer = setTimeout(() => {
                setCurrentIndex(prev => prev + 1);
            }, time);
            return () => clearTimeout(timer);
        }
    }, [currentIndex, messages.length]);

    return (
        <div className="flex flex-col items-center justify-center w-full max-w-lg mx-auto my-12 animate-fade-in">
            <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-8 shadow-2xl w-full backdrop-blur-md relative overflow-hidden">
                {/* Background Glow Effects */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl"></div>

                <h3 className="text-lg font-semibold text-slate-200 mb-6 flex items-center gap-3 relative z-10">
                    <div className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                    </div>
                    AI Reasoning Engine
                </h3>

                <div className="space-y-5 relative z-10">
                    {messages.map((msg, index) => {
                        const isCompleted = index < currentIndex;
                        const isCurrent = index === currentIndex;
                        const isPending = index > currentIndex;

                        return (
                            <div 
                                key={index} 
                                className={`flex items-center gap-4 transition-all duration-700 ease-out
                                    ${isPending ? 'opacity-20 translate-y-2 scale-95' : 'opacity-100 translate-y-0 scale-100'}
                                `}
                            >
                                <div className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full border transition-all duration-500
                                    ${isCompleted 
                                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 scale-100' 
                                        : isCurrent 
                                            ? 'border-indigo-400 border-t-transparent animate-spin' 
                                            : 'border-slate-700 bg-slate-800 scale-90'
                                    }
                                `}>
                                    {isCompleted && <IconCheck />}
                                </div>
                                
                                <span className={`text-sm font-medium transition-colors duration-500
                                    ${isCompleted ? 'text-slate-400' : isCurrent ? 'text-indigo-200' : 'text-slate-600'}
                                `}>
                                    {msg}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ThinkingProcess;
