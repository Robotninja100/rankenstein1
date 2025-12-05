
import React, { useState, useEffect } from 'react';
import { WorkflowStep, WORKFLOW_STEPS, AppState, InternalLink } from './types';
import Setup from './components/Setup';
import TopicIdeation from './components/IdeaLab';
import ResearchAndOutline from './components/ContentRepurposer';
import ArticleDrafting from './components/DraftingStudio';
import Publish from './components/AudioPublisher';
import IntroScreen from './components/IntroScreen';

// Icons
const IconMenu = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>;
const IconX = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const IconGlobe = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9V3m0 18a9 9 0 009-9m-9 9a9 9 0 00-9-9" /></svg>;
const IconLightBulb = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 017.072 0m-11.314 0a5 5 0 007.072 0M12 21v-1m-4.657-3.343l.707-.707" /></svg>;
const IconSearch = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const IconPencil = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>;
const IconUpload = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>;
const IconChevronLeft = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>;
const IconChevronRight = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>;
const IconRefresh = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>;


const STEP_COMPONENTS: Record<WorkflowStep, React.ComponentType<any>> = {
  'Setup': Setup,
  'Topic Ideation': TopicIdeation,
  'Research & Outline': ResearchAndOutline,
  'Drafting': ArticleDrafting,
  'Publish': Publish,
};

const STEP_ICONS: Record<WorkflowStep, React.ReactNode> = {
  'Setup': <IconGlobe />,
  'Topic Ideation': <IconLightBulb />,
  'Research & Outline': <IconSearch />,
  'Drafting': <IconPencil />,
  'Publish': <IconUpload />,
};

const getInitialState = (): AppState => {
  try {
    const savedState = localStorage.getItem('rankensteinAppState');
    if (savedState) {
      return JSON.parse(savedState);
    }
  } catch (error) {
    console.error("Failed to parse saved state from localStorage", error);
    localStorage.removeItem('rankensteinAppState');
  }
  return { websiteUrl: '', country: '', language: '', topic: '', outline: [], draft: '', imageUrl: '', internalLinks: [] };
};

const getInitialProgress = (initialState: AppState) => {
    if (initialState.draft) {
        return { index: 3, step: 'Publish' as WorkflowStep };
    }
    if (initialState.outline.length > 0) {
        return { index: 2, step: 'Drafting' as WorkflowStep };
    }
    if (initialState.topic) {
        return { index: 1, step: 'Research & Outline' as WorkflowStep };
    }
    if (initialState.websiteUrl) {
        return { index: 0, step: 'Topic Ideation' as WorkflowStep };
    }
    return { index: -1, step: 'Setup' as WorkflowStep };
};


const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(getInitialState);
  const [showIntro, setShowIntro] = useState(true); // Init Intro State
  
  const initialProgress = getInitialProgress(appState);
  const [activeStep, setActiveStep] = useState<WorkflowStep>(initialProgress.step);
  const [highestCompletedStepIndex, setHighestCompletedStepIndex] = useState(initialProgress.index);
  
  // Sidebar State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stateToSave = { ...appState };
      // FIX: Prevent localStorage quota exceeded error by not saving large base64 strings
      if (stateToSave.imageUrl && stateToSave.imageUrl.startsWith('data:')) {
          stateToSave.imageUrl = ''; 
      }
      localStorage.setItem('rankensteinAppState', JSON.stringify(stateToSave));
    } catch (error) {
      console.error("Failed to save state to localStorage", error);
    }
  }, [appState]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const goToStep = (stepIndex: number) => {
    if (stepIndex <= highestCompletedStepIndex + 1) {
      setActiveStep(WORKFLOW_STEPS[stepIndex]);
      setIsMobileMenuOpen(false);
    }
  };

  const handleSetupComplete = (websiteUrl: string, country: string, language: string) => {
    setAppState(prev => ({ ...prev, websiteUrl, country, language, topic: '', outline: [], draft: '', imageUrl: '', internalLinks: [] }));
    setHighestCompletedStepIndex(0);
    setActiveStep('Topic Ideation');
  };

  const handleTopicSelect = (topic: string) => {
    setAppState(prev => ({ ...prev, topic, outline: [], draft: '', imageUrl: '', internalLinks: [] }));
    setHighestCompletedStepIndex(1);
    setActiveStep('Research & Outline');
  };

  const handleOutlineComplete = (outline: string[], internalLinks: InternalLink[]) => {
    setAppState(prev => ({ ...prev, outline, internalLinks, draft: '', imageUrl: '' }));
    setHighestCompletedStepIndex(2);
    setActiveStep('Drafting');
  };

  const handleDraftComplete = (draft: string) => {
    setAppState(prev => ({ ...prev, draft }));
    setHighestCompletedStepIndex(3);
    setActiveStep('Publish');
  };
  
  const handleImageGenerated = (imageUrl: string) => {
    setAppState(prev => ({ ...prev, imageUrl }));
  };

  const handleRestart = () => {
    if (window.confirm("Are you sure you want to start over? All current progress will be lost.")) {
      const defaultState = { websiteUrl: '', country: '', language: '', topic: '', outline: [], draft: '', imageUrl: '', internalLinks: [] };
      setAppState(defaultState);
      setHighestCompletedStepIndex(-1);
      setActiveStep('Setup');
      try {
          localStorage.removeItem('rankensteinAppState');
      } catch (error) {
          console.error("Failed to clear localStorage", error);
      }
    }
  };
  
  if (showIntro) {
      return <IntroScreen onStart={() => setShowIntro(false)} />;
  }

  const ActiveComponent = STEP_COMPONENTS[activeStep];
  const componentProps = {
    appState,
    onSetupComplete: handleSetupComplete,
    onTopicSelect: handleTopicSelect,
    onOutlineComplete: handleOutlineComplete,
    onDraftComplete: handleDraftComplete,
    onImageGenerated: handleImageGenerated,
    onRestart: handleRestart,
  };

  return (
    <div className="flex h-screen bg-[#0f1117] font-sans text-slate-200 overflow-hidden animate-fade-in selection:bg-indigo-500/30">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)} 
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm md:hidden transition-opacity duration-300"
        />
      )}
      
      {/* Sidebar Navigation */}
      <nav className={`
        fixed inset-y-0 left-0 z-50 bg-[#090a0e] border-r border-white/5 flex flex-col h-full transition-all duration-300 ease-in-out shadow-2xl md:shadow-none relative
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static
        ${isSidebarCollapsed ? 'md:w-20' : 'md:w-72'}
        w-72
      `}>
        {/* Toggle Button - Vertically centered on the right edge */}
        <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute -right-3 top-1/2 transform -translate-y-1/2 z-50 hidden md:flex items-center justify-center w-6 h-6 bg-[#090a0e] border border-white/10 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-all shadow-lg"
            title={isSidebarCollapsed ? "Expand" : "Collapse"}
        >
            {isSidebarCollapsed ? <IconChevronRight className="w-3 h-3" /> : <IconChevronLeft className="w-3 h-3" />}
        </button>

        {/* Sidebar Header */}
        <div className={`flex items-center h-20 px-5 border-b border-white/5 ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          <a 
            href="https://www.skool.com/ai-marketing-hub" 
            target="_blank" 
            rel="noopener noreferrer" 
            className={`flex items-center group cursor-pointer transition-all ${isSidebarCollapsed ? 'justify-center w-full' : ''}`}
            title="Visit AI Marketing Hub"
          >
            <div className="relative flex-shrink-0">
               <img 
                  src="https://pub-6c18de93037f44df9146bef79e7b3f68.r2.dev/logo%20hub%20pro%20white.png" 
                  alt="Logo" 
                  className={`h-8 w-auto object-contain transition-transform duration-300 group-hover:scale-110 ${isSidebarCollapsed ? '' : ''}`} 
                />
            </div>
            
            {!isSidebarCollapsed && (
              <div className="ml-3 flex flex-col animate-fade-in overflow-hidden">
                 <h1 className="text-[15px] font-bold text-slate-100 leading-none tracking-tight">Rankenstein v9</h1>
                 <span className="text-[10px] text-indigo-400 font-medium mt-1 tracking-wider uppercase">mini</span>
              </div>
            )}
          </a>
          
          {/* Close button only visible on mobile */}
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-400 hover:text-white p-1">
            <IconX />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 py-6 px-3 overflow-y-auto scrollbar-hide">
          <div className="space-y-1.5">
            {WORKFLOW_STEPS.map((step, index) => {
              const isActive = activeStep === step;
              const isEnabled = index <= highestCompletedStepIndex + 1;
              
              return (
                <button
                  key={step}
                  onClick={() => goToStep(index)}
                  disabled={!isEnabled}
                  title={isSidebarCollapsed ? step : undefined}
                  className={`
                    flex items-center w-full p-3 rounded-full transition-all duration-200 group relative
                    ${isActive 
                        ? 'bg-indigo-500/10 text-indigo-300 font-semibold shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                        : isEnabled 
                            ? 'text-slate-300 hover:bg-white/5 hover:text-white' 
                            : 'text-slate-500 cursor-not-allowed opacity-60'
                    }
                    ${isSidebarCollapsed ? 'justify-center aspect-square px-0' : ''}
                  `}
                >
                  <span className={`flex-shrink-0 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                      {STEP_ICONS[step]}
                  </span>
                  
                  {!isSidebarCollapsed && (
                    <span className="ml-3.5 text-sm whitespace-nowrap overflow-hidden animate-fade-in">{step}</span>
                  )}
                  
                  {/* Tooltip for collapsed mode */}
                  {isSidebarCollapsed && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-1.5 bg-slate-800 text-slate-200 text-xs font-medium rounded-md shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-slate-700/50 backdrop-blur-sm">
                          {step}
                          <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-800 border-l border-b border-slate-700/50 transform rotate-45"></div>
                      </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Footer Actions */}
        <div className="p-4 border-t border-white/5 space-y-2">
             {!isSidebarCollapsed && (
                <button 
                    onClick={handleRestart}
                    className="flex items-center w-full p-3 text-sm font-medium text-slate-300 rounded-full hover:bg-white/5 hover:text-red-400 transition-colors group"
                >
                    <IconRefresh />
                    <span className="ml-3">New Project</span>
                </button>
             )}
             {isSidebarCollapsed && (
                 <button 
                    onClick={handleRestart}
                    title="New Project"
                    className="flex items-center justify-center w-full p-3 text-slate-300 rounded-full hover:bg-white/5 hover:text-red-400 transition-colors aspect-square"
                >
                    <IconRefresh />
                </button>
             )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-[#0f1117]">
        {/* Mobile Header Bar */}
        <div className="md:hidden flex items-center justify-between p-4 bg-[#090a0e] border-b border-white/5 sticky top-0 z-30">
             <div className="flex items-center">
                <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 mr-2 rounded-md hover:bg-white/5 text-slate-300">
                  <IconMenu />
                </button>
                <span className="font-bold text-slate-100">Rankenstein v9 <span className="text-indigo-400 text-xs uppercase">mini</span></span>
             </div>
             <a href="https://www.skool.com/ai-marketing-hub" target="_blank" rel="noopener noreferrer">
                 <img 
                    src="https://pub-6c18de93037f44df9146bef79e7b3f68.r2.dev/logo%20hub%20pro%20white.png" 
                    alt="Logo" 
                    className="h-8 w-auto object-contain" 
                  />
             </a>
        </div>

        <div className="flex-grow p-4 md:p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          <div className="max-w-6xl mx-auto h-full">
            <ActiveComponent {...componentProps} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
