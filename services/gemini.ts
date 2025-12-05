
import { GoogleGenAI, Type, Modality, GenerateContentResponse, Part, FunctionDeclaration, Tool } from "@google/genai";
import { ResearchResult, TopicIdea, CompetitorInfo, InternalLink, RankedKeyword, EeatSource } from "../types";
import { callWebhookTool } from "./webhook";

// Use process.env.API_KEY as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const PRIMARY_MODEL = 'gemini-3-pro-preview';
const FALLBACK_MODEL = 'gemini-2.5-flash';

// Helper to extract JSON from a string that might contain markdown fences
function extractJson(text: string): string {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) return match[1].trim();
    
    // Fallback: try to find the first [ or { and the last ] or }
    const firstOpen = text.search(/[{\[]/);
    const lastClose = text.search(/[}\]]$/); // Search from end isn't direct in JS regex, but let's try simple trim first
    
    if (firstOpen !== -1) {
        const lastIndex = text.lastIndexOf(text[firstOpen] === '{' ? '}' : ']');
        if (lastIndex !== -1) {
            return text.substring(firstOpen, lastIndex + 1);
        }
    }
    
    return text.trim();
}

function isQuotaError(error: any): boolean {
    // Log error to help debugging
    if (error) console.warn("Checking error for quota/server:", error);
    
    const status = error.status || error.code;

    return status === 429 || 
           status === 503 || 
           status === 500 || // Generic Server Error
           status === 'RESOURCE_EXHAUSTED' ||
           status === 'PERMISSION_DENIED' ||
           (error.message && (
               error.message.includes('429') || 
               error.message.includes('quota') || 
               error.message.includes('RESOURCE_EXHAUSTED') ||
               error.message.includes('Too Many Requests') ||
               error.message.includes('Rpc failed') || // Catch RPC/Network failures
               error.message.includes('xhr error') ||  // Catch XHR failures
               error.message.includes('500') ||
               error.message.includes('overloaded')
           ));
}

/**
 * Retries an async operation with exponential backoff.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, baseDelay = 2000): Promise<T> {
    try {
        return await fn();
    } catch (error: any) {
        // Retry on 429s or 500s that might be transient
        if (retries > 0 && isQuotaError(error)) {
            console.warn(`Gemini API Error (${error.status || error.code || 'Error'}). Retrying in ${baseDelay}ms... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, baseDelay));
            return withRetry(fn, retries - 1, baseDelay * 2);
        }
        throw error;
    }
}

/**
 * Tries a primary model function, and falls back to a secondary model function if quota is exceeded.
 */
async function withModelFallback<T>(
    primaryFn: (model: string) => Promise<T>,
    fallbackFn: (model: string) => Promise<T> = primaryFn
): Promise<T> {
    try {
        // Try with retries on the primary model first
        return await withRetry(() => primaryFn(PRIMARY_MODEL), 1, 1000);
    } catch (error: any) {
        if (isQuotaError(error)) {
            console.warn(`Primary model (${PRIMARY_MODEL}) failed with ${error.status || error.code || 'error'}. Switching to fallback model (${FALLBACK_MODEL}).`);
            // Try the fallback model with standard retries
            return await withRetry(() => fallbackFn(FALLBACK_MODEL), 3, 2000);
        }
        throw error;
    }
}

export async function generateTopicIdeas(theme: string): Promise<TopicIdea[]> {
    return withRetry(async () => {
        try {
            // Using Flash for faster ideation (Standard for this task)
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `You are an expert content strategist specializing in Generative Engine Optimization (GEO) and building Content Authority. 
                
                Based on the theme '${theme}', generate 5 blog topic ideas that are designed to be "Uniquely Citable Assets".
                
                Criteria for topics:
                1.  **Answer-First Potential:** Topics that allow for a direct, definitive answer or definition immediately (good for AI overviews).
                2.  **High Utility:** Topics that solve specific problems ("How-to", "Ultimate Guides").
                3.  **Data/Analysis Potential:** Topics where we can present "original" analysis or structured comparisons (Lists, Tables).
                
                For each idea, provide:
                - A catchy, SEO-friendly title (Title Case).
                - A brief description of why this topic builds authority.

                Respond with a valid, perfectly formatted JSON array of objects, where each object has "title" and "description" keys.`,
                config: {
                    tools: [{ googleSearch: {} }],
                },
            });
            
            const jsonString = extractJson(response.text);
            return JSON.parse(jsonString);
        } catch (error) {
            console.error("Error generating topic ideas:", error);
            throw new Error("Failed to generate topic ideas. Please try a different theme.");
        }
    });
}

export async function generateTopicIdeasForWebsite(websiteUrl: string, country: string, language: string): Promise<TopicIdea[]> {
    return withRetry(async () => {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `You are an expert content strategist specializing in Generative Engine Optimization (GEO). 
                
                Task: Analyze the website '${websiteUrl}' using Google Search to understand its niche, authority level, and audience.
                
                Then, generate 5 blog topic ideas for the '${country}' market in '${language}' that would help this specific website build "Topical Authority".
                
                The topics must:
                1.  Fill a gap in the current content strategy.
                2.  Lend themselves to structured formatting (Tables, Lists, Steps) which AI models prefer.
                3.  Be specific enough to demonstrate "Experience" (E-E-A-T).

                Respond with a valid JSON array of objects, where each object has "title" and "description" keys.`,
                config: {
                    tools: [{ googleSearch: {} }],
                },
            });
            
            const jsonString = extractJson(response.text);
            return JSON.parse(jsonString);
        } catch (error) {
            console.error("Error generating topic ideas for website:", error);
            throw new Error("Failed to generate topic ideas for your website. Please check the URL or try a manual theme.");
        }
    });
}


export async function analyzeCompetitors(topic: string): Promise<{ competitors: Omit<CompetitorInfo, 'url'>[], groundingLinks: CompetitorInfo[] }> {
    return withRetry(async () => {
        try {
            const response = await ai.models.generateContent({
                model: PRIMARY_MODEL,
                contents: `You are an SEO analyst. For the topic '${topic}', perform in-depth research using Google Search to analyze the top 3 competing articles. 
                
                For each competitor, identify:
                1. Their main argument.
                2. **Content Gaps:** What are they missing? (e.g., Lack of original data, poor formatting, outdated info, lack of specific examples).
                3. **Structure:** Do they use tables, lists, or specific schema?

                Respond with a valid JSON object with a "competitors" key. "competitors" should be an array of objects.
                
                CRITICAL: Each object MUST have exactly two keys:
                - "title": string
                - "summary": string. Combine the argument, gaps, and structure analysis into this SINGLE string. Do NOT use nested objects.`,
                config: {
                    tools: [{ googleSearch: {} }],
                },
            });

            const jsonString = extractJson(response.text);
            const parsedData = JSON.parse(jsonString);
            
            // Robust mapping to ensure summary is always a string (fixes React Error #31)
            const competitors = (parsedData.competitors || []).map((c: any) => {
                let summaryText = "";
                
                // If model returns a string as requested
                if (typeof c.summary === 'string') {
                    summaryText = c.summary;
                } 
                // If model returns an object (e.g. {main_argument: ...}), flatten it
                else if (typeof c.summary === 'object' && c.summary !== null) {
                    summaryText = Object.entries(c.summary)
                        .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
                        .join('. ');
                }
                // If model put keys at root level instead of inside summary
                else {
                    const parts = [];
                    if (c.main_argument) parts.push(`Argument: ${c.main_argument}`);
                    if (c.content_gaps) parts.push(`Gaps: ${c.content_gaps}`);
                    if (c.structure) parts.push(`Structure: ${c.structure}`);
                    summaryText = parts.join('. ') || "Analysis available in source link.";
                }

                return {
                    title: typeof c.title === 'string' ? c.title : 'Competitor Analysis',
                    summary: summaryText
                };
            });
            
            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
            
            const groundingLinks: CompetitorInfo[] = groundingChunks
                .map(chunk => ({
                    title: chunk.web?.title ?? 'Unknown Source',
                    url: chunk.web?.uri ?? '#',
                    summary: '' 
                }))
                .filter(link => link.url !== '#');

            return { competitors, groundingLinks };

        } catch (error) {
            console.error("Error analyzing competitors:", error);
            throw new Error("Failed to analyze competitor data.");
        }
    });
}

export async function findEeatSources(topic: string): Promise<EeatSource[]> {
    return withRetry(async () => {
        const prompt = `
            You are a research assistant building E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) for a blog post about "${topic}".

            Find 3-4 highly authoritative, non-commercial sources that can be cited to back up claims. 
            **Priority Sources:**
            1.  Original Research / Studies / Statistics.
            2.  Government (.gov) or Academic (.edu) publications.
            3.  Recognized Industry Standards bodies.

            **Exclude:** Generic blogs, competitors, or sales pages.

            For each source, provide:
            1. "title"
            2. "url"
            3. "summary": A single string sentence explaining exactly what data point or insight this source provides. Do NOT return an object.

            Respond with ONLY a valid JSON array of objects.
        `;
        try {
            const response = await ai.models.generateContent({
                model: PRIMARY_MODEL,
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                },
            });
            const jsonString = extractJson(response.text);
            const parsed = JSON.parse(jsonString);
            
            // Safety map
            return Array.isArray(parsed) ? parsed.map((s: any) => ({
                title: s.title || "Source",
                url: s.url || "#",
                summary: typeof s.summary === 'object' ? JSON.stringify(s.summary) : String(s.summary || "")
            })) : [];
        } catch (error) {
            console.error("Error finding E-E-A-T sources:", error);
            throw new Error("Failed to find E-E-A-T sources.");
        }
    });
}


export async function generateKeywordStrategy(
    topic: string,
    rankedKeywords: RankedKeyword[],
    callWebhook: (func: 'suggested_keywords', params: { keyword: string }) => Promise<any[]>
): Promise<string[]> {
    return withRetry(async () => {
        try {
            // Step 1: Extract 3 seed keywords to ensure broad coverage
            // CRITICAL: User wants 1-2 words max for seeds to get long tail results
            const seedPrompt = `
                Identify 3 distinct, high-search-volume seed keywords (maximum 2 words each) related to the topic: "${topic}".
                These will be used to query a keyword database.
                Respond with ONLY a valid JSON array of strings. Example: ["keyword one", "keyword two", "keyword three"]
            `;
            
            const seedResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: seedPrompt,
            });
            let seeds: string[] = [];
            try {
                seeds = JSON.parse(extractJson(seedResponse.text));
            } catch (e) {
                seeds = [topic.split(' ').slice(0, 2).join(' ')]; 
            }

            // Step 2: Call the webhook multiple times in parallel for richer data
            let allSuggestions: any[] = [];
            if (seeds.length > 0) {
                 // Limit to 3 seeds to balance speed and depth
                 const limitedSeeds = seeds.slice(0, 3);
                 const promises = limitedSeeds.map(seed => 
                    callWebhook('suggested_keywords', { keyword: seed })
                        .catch(err => {
                            console.warn(`Keyword lookup failed for seed "${seed}":`, err);
                            return [];
                        })
                 );
                 const results = await Promise.all(promises);
                 allSuggestions = results.flat();
            }

            // Step 3: AI Selection
            const selectionPrompt = `
                Topic: "${topic}"
                
                Goal: Select 10 target keywords including long-tail questions.
                
                Available Data:
                1. Tool Suggestions (from seeds: ${seeds.join(', ')}): ${JSON.stringify(allSuggestions.slice(0, 50))}
                2. Existing Rankings: ${JSON.stringify(rankedKeywords.map(k => k.keyword).slice(0, 20))}

                Instructions:
                - Prioritize high-volume, long-tail keywords.
                - Include question-based keywords ("How to...", "What is...").
                - If tool data is missing, infer high-value keywords based on search logic.

                Respond with ONLY a valid JSON array of 10 keyword strings.
            `;

            const finalKeywordsResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: selectionPrompt,
                config: {
                    tools: [{ googleSearch: {} }],
                },
            });
            const jsonString = extractJson(finalKeywordsResponse.text);
            return JSON.parse(jsonString);

        } catch (error) {
            console.error("Error generating keyword strategy:", error);
            throw new Error("Failed to generate a keyword strategy.");
        }
    });
}


export async function generateOutlineSuggestions(topic: string): Promise<string[]> {
    return withRetry(async () => {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `For the topic "${topic}", suggest 3 structural approaches that follow the **Answer-First (Inverted Pyramid)** model for Generative Engine Optimization.
                
                Examples: 
                - "Definitive Guide (Definition + Steps + Data)"
                - "Comparative Analysis (Table-heavy + Pros/Cons)"
                - "Problem/Solution (Direct Answer + Detailed Walkthrough)"
                
                Respond with a valid JSON array of 3 string titles describing the structure.`,
            });
            const jsonString = extractJson(response.text);
            return JSON.parse(jsonString);
        } catch (error) {
            console.error("Error generating outline suggestions:", error);
            throw new Error("Failed to generate outline suggestions.");
        }
    });
}

export async function selectRelevantInternalLinks(topic: string, allLinks: InternalLink[]): Promise<InternalLink[]> {
    return withRetry(async () => {
        const prompt = `
            You are building a "Content Cluster" to establish Topical Authority.
            
            Main Topic: "${topic}"
            
            Task: Select 3-5 internal links from the list below that are logically related to the main topic. These will be used to build a "hub and spoke" model.
            
            List:
            ${allLinks.map(link => `- ${link.title} (${link.url})`).join('\n')}

            Respond with a valid JSON array of objects ({title, url}).
        `;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                url: { type: Type.STRING }
                            },
                            required: ["title", "url"]
                        }
                    }
                }
            });
            return JSON.parse(response.text);
        } catch (error) {
            console.error("Error selecting relevant internal links:", error);
            return [];
        }
    });
}


export async function generateOutline(topic: string, keywords: string[], competitors: Omit<CompetitorInfo, 'url'>[], internalLinks: InternalLink[]): Promise<string[]> {
    return withRetry(async () => {
        const prompt = `
            Create a detailed, GEO-optimized blog post outline for: '${topic}'.
            
            **Strategy: The AI-Citable Blog**
            1.  **Answer-First / Inverted Pyramid:** The very first section after the Intro must provide the direct answer, summary, or definition that a user (or AI) is looking for.
            2.  **E-E-A-T:** Include specific sections for "Key Takeaways", "Expert Analysis", or "Data Breakdown".
            3.  **Machine Readability:** Plan for sections that will use Lists or Tables.
            
            Target Keywords: ${keywords.join(', ')}
            
            Competitor Context (Beat these):
            ${competitors.map(c => `- ${c.title}: ${c.summary}`).join('\n')}
            
            Internal Links to Weave In:
            ${internalLinks.map(l => `- ${l.title} (${l.url})`).join('\n')}

            Format:
            - Provide clean descriptive section titles only.
            - **PROHIBITED:** Do NOT include "H2", "H3", "Section:" or numeric prefixes in the strings.
            - Use indentation (2 spaces) to denote hierarchy.

            Example structure:
            - Introduction (Hook + Thesis)
            - Direct Answer / Core Definition
            - Main Point 1
              - Detail for Point 1
            - Conclusion

            Respond with a valid JSON array of strings.
        `;
        try {
            const response = await ai.models.generateContent({
                model: PRIMARY_MODEL,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                }
            });
            return JSON.parse(response.text);
        } catch (error) {
            console.error("Error generating outline:", error);
            throw new Error("Failed to generate the article outline.");
        }
    });
}

export async function refineOutlineWithAI(
    currentOutline: string, 
    topic: string, 
    keywords: string[], 
    competitors: Omit<CompetitorInfo, 'url'>[], 
    internalLinks: InternalLink[]
): Promise<string[]> {
    return withRetry(async () => {
        const prompt = `
            Refine this outline to maximize "Generative Engine Optimization" (GEO) and E-E-A-T.

            Topic: '${topic}'
            
            Checklist for refinement:
            1.  **Is the "Direct Answer" prominent near the top?**
            2.  **Are there opportunities for Tables or structured lists?** (Add notes like "[Table: comparison of x and y]" if missing).
            3.  **Does it cover the 'People Also Ask' questions implied by the keywords:** ${keywords.slice(0,5).join(', ')}?
            4.  **Does it demonstrate depth of expertise?**

            Current Outline:
            ---
            ${currentOutline}
            ---
            
            **Strict Formatting:**
            - Return ONLY strings representing the sections.
            - Do NOT include "H2" or "H3" labels.
            - Keep indentation for hierarchy.

            Respond with the improved JSON array of strings.
        `;
        try {
            const response = await ai.models.generateContent({
                model: PRIMARY_MODEL,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                }
            });
            return JSON.parse(response.text);
        } catch (error) {
            console.error("Error refining outline:", error);
            throw new Error("Failed to refine the article outline with AI.");
        }
    });
}


export async function generateLongFormContent(prompt: string, internalLinks: InternalLink[]) {
    // Wrapped in model fallback logic - Primary is Gemini 3.0 Pro
    return await withModelFallback(async (model) => {
        const internalLinksText = internalLinks.length > 0
            ? `
            INTEGRATION INSTRUCTION:
            You MUST naturally weave the following internal links into the body text. 
            Do not force them. Use them as reference for further reading on sub-topics.
            Links: ${internalLinks.map(l => `- ${l.title} (${l.url})`).join('\n')}
            `
            : '';

        try {
            const textPrompt = `
                ${prompt}
                ${internalLinksText}

                **MANDATORY WRITING GUIDELINES (STRICT):**

                1.  **Pure Markdown Output Only:** 
                    - **NO FILLER:** Do NOT include ANY introductory text like "Here is the article", "Here is a draft", "Sure, I can help".
                    - **NO HEADER LABELS:** Do NOT use words like "H1", "H2", "H3", "Title:", "Section:". **ONLY** use standard Markdown hash symbols (#, ##, ###) for headers.
                      - **CORRECT:** ## The Benefits of Yoga
                      - **INCORRECT:** H2: The Benefits of Yoga
                      - **INCORRECT:** **H2** The Benefits of Yoga
                    - **Title:** The output must start immediately with the # Title.

                2.  **The "Answer-First" Mandate:** 
                    - The very first paragraph must be a **Direct Answer**, Definition, or clear Summary of the solution. This allows AI to cite the top of the article.

                3.  **Format for Machine Readability:**
                    - **Structure:** Use ## for main sections and ### for subsections.
                    - **Content Flow:** Every ## Header MUST be followed by introductory text (1-2 paragraphs) before any nested ### headers appear.
                    - **Paragraphs:** Keep them short (2-3 sentences max).
                    - **Keywords:** Use **bolding** for core concepts.
                    - **Lists:** Use bullet points liberally.
                    - **Tables:** You MUST include at least one Markdown data table.

                4.  **Voice & Tone:**
                    - Write as a seasoned expert. Authoritative but conversational.

                5.  **Visuals:**
                    - Include placeholders: \`[IMAGE: detailed prompt]\` or \`[GRAPH: description]\`.

                Stream the content now.
            `;
            return await ai.models.generateContentStream({
                model: model,
                contents: textPrompt,
            });
        } catch (error) {
            console.error(`Error generating content with model ${model}:`, error);
            throw error; // Propagate to fallback handler
        }
    });
}

export async function reviewArticle(draft: string): Promise<string> {
    return await withModelFallback(async (model) => {
        const prompt = `
            You are an expert Editor preparing this content for WordPress publication.

            **Your Task:** Clean and Polish the Markdown draft.

            **CRITICAL RULES - REMOVE ALL FILLER:**
            1.  **Delete Labels:** Remove any text that explicitly labels the section type (e.g. "H1", "H2", "H3", "Title:", "Introduction:", "Section:"). 
                - Transform "H2: Title" to "## Title".
                - Transform "Section: Title" to "## Title".
            2.  **Delete Meta-Talk:** Remove any intro/outro text from the AI (e.g. "Here is the generated blog post...", "I hope this helps"). The output must start with the # Title and end with the final paragraph.
            3.  **Fix Hierarchy:** Ensure ## Headers are never immediately followed by ### Headers. Insert a summary sentence if text is missing between headers.
            4.  **Fix Spacing:** Ensure there is a blank line before and after every table, code block, and list.
            5.  **Preserve:** Keep all internal links and [IMAGE] placeholders exactly as they are.

            Draft to Review:
            ---
            ${draft}
            ---

            Return ONLY the final cleaned Markdown.
        `;
        try {
            const response = await ai.models.generateContent({
                model: model,
                contents: prompt,
            });
            return response.text.trim();
        } catch (error) {
            console.error(`Error reviewing article with model ${model}:`, error);
            throw error;
        }
    });
}

export async function generateContextualAddition(
    prevContext: string, 
    nextContext: string, 
    type: 'TEXT' | 'IMAGE' | 'GRAPH' | 'TABLE'
): Promise<string> {
    return await withModelFallback(async (model) => {
        try {
            const prompt = `
                You are a content assistant. 
                Context Before: "...${prevContext.slice(-300)}..."
                Context After: "...${nextContext.slice(0, 300)}..."
                
                Task:
                ${type === 'TEXT' ? 'Write a single bridging paragraph (2-3 sentences) that naturally connects the context before to the context after. Maintain the same tone.' : ''}
                ${type === 'IMAGE' ? 'Generate a specific, descriptive prompt for an image that would fit perfectly between these two sections. Return ONLY the prompt text.' : ''}
                ${type === 'GRAPH' ? 'Generate a description for a data visualization, chart, or graph that would illustrate the point being made. Return ONLY the description.' : ''}
                ${type === 'TABLE' ? 'Generate a Markdown data table that organizes relevant information from the context or adds value (e.g. Pros/Cons, Features, Comparisons). Return ONLY the markdown table.' : ''}
                
                Do not include "Here is the text" or quotes. Just the content.
            `;

            const response = await ai.models.generateContent({
                model: model,
                contents: prompt,
            });
            
            let result = response.text.trim();
            if (type === 'IMAGE') return `[IMAGE: ${result}]`;
            if (type === 'GRAPH') return `[GRAPH: ${result}]`;
            return result;

        } catch (error) {
            console.error(`Error generating contextual addition with model ${model}:`, error);
            throw error;
        }
    });
}

export async function chatWithDraft(
    currentDraft: string,
    chatHistory: { role: 'user' | 'model'; text: string }[],
    userMessage: string,
    appState: { websiteUrl: string, country: string, language: string }
): Promise<string> {
    return await withModelFallback(async (model) => {
        try {
            // Define tools for the chat
            const webhookTool: Tool = {
                functionDeclarations: [
                    {
                        name: 'get_keyword_data',
                        description: 'Get search volume and competition data for a keyword.',
                        parameters: {
                            type: Type.OBJECT,
                            properties: { keyword: { type: Type.STRING } },
                            required: ['keyword']
                        }
                    },
                    {
                        name: 'analyze_url',
                        description: 'Analyze a specific URL for content gaps or data.',
                        parameters: {
                            type: Type.OBJECT,
                            properties: { url: { type: Type.STRING } },
                            required: ['url']
                        }
                    }
                ]
            };

            const chat = ai.chats.create({
                model: model,
                config: {
                    tools: [webhookTool, { googleSearch: {} }],
                    systemInstruction: `You are an expert Content Editor assistant. 
                    You have access to the full article draft.
                    User will ask you to modify the draft or answer questions about it.
                    
                    If the user asks to "Rewrite" or "Add" something, you must output the SPECIFIC section of markdown that changed, or the whole article if requested.
                    If the user asks for data, use the available tools.
                    
                    Current Draft Context (Reference only, do not output unless asked):
                    ${currentDraft.substring(0, 10000)}... (truncated if too long)
                    `
                },
                history: chatHistory.map(h => ({
                    role: h.role,
                    parts: [{ text: h.text }]
                }))
            });

            const result = await chat.sendMessage({ message: userMessage });
            
            // Handle function calls
            const toolCalls = result.functionCalls;
            if (toolCalls && toolCalls.length > 0) {
                // Simple handling: Execute first tool call and send back to model
                const call = toolCalls[0];
                let toolResult = "";
                
                if (call.name === 'get_keyword_data') {
                     const data = await callWebhookTool('suggested_keywords', appState, { keyword: call.args.keyword as string });
                     toolResult = JSON.stringify(data);
                } else if (call.name === 'analyze_url') {
                     const data = await callWebhookTool('url_scrape', appState, { url: call.args.url as string });
                     toolResult = JSON.stringify(data);
                }

                const nextResponse = await chat.sendMessage({
                    parts: [{
                        functionResponse: {
                            name: call.name,
                            response: { result: toolResult }
                        }
                    }]
                });
                return nextResponse.text;
            }

            return result.text;

        } catch (error) {
            console.error("Chat error:", error);
            throw error; // Let fallback handle it if quota issue
        }
    });
}

export async function generateArticleImage(prompt: string): Promise<string> {
    // Natural, authentic photography style prompt enforcement
    const stylePrompt = "Authentic editorial photography, natural lighting, shot on 35mm film, minimal processing, photorealistic, highly detailed, cinematic composition. Wide angle 16:9 aspect ratio. Avoid oversaturated colors, avoid plastic skin textures, avoid surrealism, avoid 3D render styles, avoid AI-generated look.";
    const enhancedPrompt = `${prompt} . ${stylePrompt}`;

    // Method: Nano Banana (Gemini 2.5 Flash Image) - Fast & Reliable
    // Explicitly using gemini-2.5-flash-image as per "Nano Banana Normal" request.
    const tryNanoBanana = async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: enhancedPrompt }] },
        });
        const parts = response.candidates?.[0]?.content?.parts;
        if (parts) {
            for (const part of parts) {
                if (part.inlineData) {
                     return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
                }
            }
        }
        throw new Error("No image data from Nano Banana.");
    };

    // Fallback Method: Imagen 4.0 (Imagen 3)
    const tryImagen4 = async () => {
        console.log("Falling back to Imagen 4.0...");
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: enhancedPrompt,
            config: {
                numberOfImages: 1,
                aspectRatio: '16:9', // Perfect for WordPress Featured Image
            },
        });
        const base64 = response.generatedImages?.[0]?.image?.imageBytes;
        if (base64) {
            return `data:image/png;base64,${base64}`;
        }
        throw new Error("No image data from Imagen 4.0.");
    };

    try {
        return await withRetry(tryNanoBanana, 1, 1000);
    } catch (error: any) {
        console.warn("Nano Banana failed, trying Imagen...", error);
        return await withRetry(tryImagen4, 1, 2000);
    }
}

export async function editArticleImage(base64Image: string, mimeType: string, prompt: string): Promise<string> {
    // Editing currently supported best on Nano Banana via multimodel input
    return withRetry(async () => {
        const stylePrompt = "Ensure result looks like authentic editorial photography, natural lighting, photorealistic. Avoid AI-generated look.";
        const enhancedPrompt = `${prompt} - ${stylePrompt}`;

        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType: mimeType,
            },
        };
        const textPart = { text: enhancedPrompt };

        try {
            // Use Flash Image for editing
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [imagePart, textPart] },
            });
            
            const parts = response.candidates?.[0]?.content?.parts;
            if (parts) {
                for (const part of parts) {
                    if (part.inlineData) {
                        return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
                    }
                }
            }
            throw new Error("No image data received from API for editing.");
        } catch (error) {
            console.error("Error editing image:", error);
            throw new Error("Failed to edit image.");
        }
    });
}

export async function transformText(text: string, action: string, language: string): Promise<string> {
    return await withModelFallback(async (model) => {
        let instruction = '';
        switch (action) {
            case 'Shorten': instruction = 'Condense this text significantly. Remove fluff. Keep the core meaning.'; break;
            case 'Elaborate': instruction = 'Expand on this text with more details, examples, and context.'; break;
            case 'Formalize': instruction = 'Rewrite this text to be professional, authoritative, and business-appropriate.'; break;
            case 'Simplify': instruction = 'Simplify the language to an 8th-grade reading level for maximum accessibility.'; break;
            case 'Summarize': instruction = 'Create a bolded "Key Takeaway" summary of this text.'; break;
            case 'Humanize': instruction = 'Inject conversational nuance. Use "we", "you", and authentic phrasing to sound less like a robot.'; break;
            default: instruction = action;
        }

        try {
            const response = await ai.models.generateContent({
                model: model,
                contents: `
                Role: Expert Editor.
                Task: Rewrite the text below according to the Instruction.
                
                Instruction: ${instruction}
                Language: ${language}
                
                Text:
                """${text}"""
                
                CRITICAL OUTPUT RULES:
                1. Return ONLY the rewritten text.
                2. Do NOT output a list of options (e.g. "Option 1", "Option 2").
                3. Do NOT include any conversational filler (e.g., "Here is the text").
                4. Provide exactly ONE best version.
                `,
            });
            return response.text.trim();
        } catch (error) {
            console.error(`Error transforming text with action "${action}" on model ${model}:`, error);
            throw error;
        }
    });
}

export async function regenerateTitle(articleContent: string): Promise<string> {
    return withRetry(async () => {
        const prompt = `
            Generate a "Click-Worthy" but "Trustworthy" Headline for this article.
            
            Guidelines:
            1.  **The 80/20 Rule:** The headline is critical.
            2.  **Formulas:** Use "How To", "Listicle (7 Ways...)", or "The Ultimate Guide".
            3.  **Hooks:** Include specificity (numbers, brackets like [2025 Update]).
            4.  **Length:** Under 60 chars ideal, max 100.

            Article Snippet:
            ---
            ${articleContent.substring(0, 2000)} 
            ---

            Respond with ONLY the headline.
        `;
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            return response.text.trim();
        } catch (error) {
            console.error("Error regenerating title:", error);
            throw new Error("Failed to regenerate the title.");
        }
    });
}

export async function generateSpeech(text: string, voice: string): Promise<string> {
    return withRetry(async () => {
        try {
            const response: GenerateContentResponse = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: `Read this with an engaging, professional, podcast-style tone: ${text}` }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: voice },
                        },
                    },
                },
            });
            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!base64Audio) throw new Error("No audio data received.");
            return base64Audio;
        } catch (error) {
            console.error("Error generating speech:", error);
            throw new Error("Failed to generate speech.");
        }
    });
}

export async function generateSocialPosts(text: string): Promise<Record<string, string>> {
     return withRetry(async () => {
         try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Create high-engagement social media posts for this article.
                
                1. **LinkedIn:** Professional, thought-leadership focus. Use bullet points. Ask a question to drive comments. Minimal hashtags (max 3).
                2. **Twitter (X):** Punchy, thread-starter style. Use hooks and data points. (3-4 hashtags).
                3. **Reddit:** Community-focused, conversational, and value-driven. Avoid salesy language. NO hashtags.
                4. **Instagram:** Visual storytelling caption. Engaging hook. Many hashtags (10-15) at the bottom.
                5. **Facebook:** Engaging, shareable, and community-oriented tone. (2-3 hashtags).
                
                Respond in JSON: { "twitter": "...", "linkedin": "...", "reddit": "...", "instagram": "...", "facebook": "..." }
                
                Article: """${text}"""`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            twitter: { type: Type.STRING },
                            linkedin: { type: Type.STRING },
                            reddit: { type: Type.STRING },
                            instagram: { type: Type.STRING },
                            facebook: { type: Type.STRING },
                        }
                    }
                }
            });
            
            return JSON.parse(response.text);
        } catch (error) {
            console.error("Error generating social posts:", error);
            throw new Error("Failed to generate social posts.");
        }
    });
}
