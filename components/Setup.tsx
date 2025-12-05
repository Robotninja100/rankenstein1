import React, { useState } from 'react';

interface Props {
    onSetupComplete: (websiteUrl: string, country: string, language: string) => void;
}

const COUNTRIES = [
    'Australia', 'Austria', 'Bahrain', 'Bangladesh', 'Belgium', 'Brazil', 'Bulgaria', 'Canada', 'Chile', 'Colombia', 'Croatia', 'Cyprus', 'Czechia', 'Denmark', 'Egypt', 'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hong Kong', 'Hungary', 'India', 'Indonesia', 'Ireland', 'Israel', 'Italy', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Malaysia', 'Mexico', 'Morocco', 'Netherlands', 'New Zealand', 'Nigeria', 'Norway', 'Pakistan', 'Philippines', 'Poland', 'Portugal', 'Romania', 'Saudi Arabia', 'Serbia', 'Singapore', 'South Africa', 'South Korea', 'Spain', 'Sri Lanka', 'Sweden', 'Switzerland', 'Taiwan', 'Thailand', 'Tunisia', 'Turkiye', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Vietnam'
];

const LANGUAGES = [
    'Arabic', 'Bengali', 'Bulgarian', 'Chinese (Simplified)', 'Chinese (Traditional)', 'Croatian', 'Czech', 'Danish', 'Dutch', 'English', 'Estonian', 'Finnish', 'French', 'German', 'Greek', 'Hebrew', 'Hindi', 'Hungarian', 'Indonesian', 'Italian', 'Japanese', 'Korean', 'Macedonian', 'Malay', 'Norwegian (Bokmål)', 'Polish', 'Portuguese', 'Romanian', 'Russian', 'Serbian', 'Slovak', 'Spanish', 'Swedish', 'Tagalog', 'Thai', 'Turkish', 'Ukrainian', 'Urdu', 'Vietnamese'
];

const Setup: React.FC<Props> = ({ onSetupComplete }) => {
    const [websiteUrl, setWebsiteUrl] = useState('example.com');
    const [country, setCountry] = useState('United States');
    const [language, setLanguage] = useState('English');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!websiteUrl.trim()) return;
        onSetupComplete(websiteUrl.trim(), country, language);
    };

    return (
        <div className="h-full flex flex-col justify-center animate-fade-in">
            <div className="grid md:grid-cols-2 gap-x-16 gap-y-8 items-center">
                <header className="text-center md:text-left">
                    <h2 className="text-4xl lg:text-5xl font-bold text-slate-100">Step 0: Setup</h2>
                    <p className="text-slate-400 mt-4 text-lg">
                        Provide some initial context for your content generation. This helps the AI tailor its responses to your specific audience and goals.
                    </p>
                </header>
                
                <div className="bg-slate-950/50 border border-slate-800 p-8 rounded-xl shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="website-url" className="block text-sm font-medium text-slate-300 mb-2">
                                Website Link
                            </label>
                            <input
                                id="website-url"
                                type="text"
                                value={websiteUrl}
                                onChange={(e) => setWebsiteUrl(e.target.value)}
                                placeholder="e.g., 'example.com'"
                                className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>
                        
                        <div>
                            <label htmlFor="country-select" className="block text-sm font-medium text-slate-300 mb-2">
                                Country
                            </label>
                            <select
                                id="country-select"
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            >
                                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="language-select" className="block text-sm font-medium text-slate-300 mb-2">
                                Language
                            </label>
                            <select
                                id="language-select"
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            >
                                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={!websiteUrl.trim()}
                                className="w-full px-6 py-3 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
                            >
                                Continue
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Setup;
