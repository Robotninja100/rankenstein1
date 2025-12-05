
import { AppState, InternalLink, RankedKeyword } from '../types';

const WEBHOOK_URL: string = 'https://agrici.app.n8n.cloud/webhook/mini-rankenstein-v9-tools';

interface WebhookPayload {
    function: 'url_map' | 'url_scrape' | 'page_ranked_keywords' | 'suggested_keywords';
    url?: string;
    country?: string;
    language?: string;
    keyword?: string;
}

export async function callWebhookTool(
    func: WebhookPayload['function'],
    appState: Pick<AppState, 'websiteUrl' | 'country' | 'language'>,
    extraParams?: { url?: string; keyword?: string }
): Promise<any> {
    // Quick check to warn user if they haven't set up the webhook
    if (WEBHOOK_URL === 'YOUR-WEBHOOK-URL' || !WEBHOOK_URL) {
        console.warn("Webhook URL is not configured. Please update services/webhook.ts with your n8n/backend URL.");
        if (func === 'url_map') return [] as InternalLink[];
        if (func === 'page_ranked_keywords') return [] as RankedKeyword[];
        return null;
    }

    const payload: WebhookPayload = {
        function: func,
        url: extraParams?.url || appState.websiteUrl,
        country: appState.country,
        language: appState.language,
        ...extraParams
    };

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Webhook error response:", errorText);
            try {
                const errorData = JSON.parse(errorText);
                throw new Error(errorData.message || `Webhook request failed with status ${response.status}`);
            } catch (e) {
                 throw new Error(`Webhook request failed with status ${response.status}: ${errorText}`);
            }
        }
        
        const responseText = await response.text();
        if (!responseText) {
            if (func === 'url_map') return [] as InternalLink[];
            if (func === 'page_ranked_keywords') return [] as RankedKeyword[];
            return null;
        }
        
        const responseData = JSON.parse(responseText);
        
        // Handle potentially nested data structure by checking the first element of the array
        const data = Array.isArray(responseData) && responseData.length > 0 ? responseData[0] : responseData;

        if (func === 'url_map') {
            const links = data?.internal_links;
            if (Array.isArray(links)) {
                return links
                    .map((item: any): InternalLink | null => {
                        if (!item || (typeof item.url !== 'string' && typeof item.loc !== 'string')) {
                             console.warn('Skipping invalid item in url_map response:', item);
                            return null;
                        }

                        const url = item.url || item.loc;
                        let title = item.title;

                        if (!title || typeof title !== 'string') {
                            const path = url.split('/').filter(Boolean).pop() || '';
                            const generatedTitle = path.replace(/[-_]/g, ' ').replace(/\.[^/.]+$/, "")
                                         .split(' ')
                                         .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                         .join(' ');
                            title = generatedTitle || url;
                        }
                        
                        return { url, title };
                    })
                    .filter((item): item is InternalLink => item !== null);
            }
            return [] as InternalLink[];
        }
        
        if (func === 'page_ranked_keywords') {
            // The data might be nested under `ranked_keywords` or be the direct array.
            const keywords = data?.ranked_keywords || (Array.isArray(data) ? data : []);
            if (Array.isArray(keywords)) {
                 return keywords.map((kw: any): RankedKeyword => ({
                    keyword: kw.Keyword || kw.keyword || '',
                    competition: kw.competition_score || 0,
                    competition_level: kw.competition_level || 'UNKNOWN',
                    cpc: kw.cpc || 0,
                    search_volume: kw.search_volume || 0,
                    difficulty: kw.keyword_difficulty || 0,
                    intent: kw.intent || 'unknown',
                }));
            }
            return [] as RankedKeyword[];
        }
        
        if (func === 'suggested_keywords') {
            // Handle the nested "related_keyword" structure
            if (data && Array.isArray(data.related_keyword)) {
                return data.related_keyword.map((kw: any) => kw.keyword).filter(Boolean);
            }

            // Fallback for other potential structures
            const keywords = data?.suggested_keywords || (Array.isArray(data) ? data : []);
            if (Array.isArray(keywords)) {
                return keywords.map((kw: any) => kw.Keyword || kw.keyword || kw).filter(Boolean);
            }
            return [];
        }

        return responseData;

    } catch (error: any) {
        console.error(`Error calling webhook for function "${func}":`, error);
        throw new Error(`Failed to get data from custom tool: ${func}. ${error.message}`);
    }
}
