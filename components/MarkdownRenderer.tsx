
import React from 'react';

interface Props {
    content: string;
}

// Helper to create a URL-friendly slug
function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-');         // Replace multiple - with single -
}

export class MarkdownProcessor {
    private content: string;

    constructor(props: Props) {
        this.content = props.content;
    }

    private applyInlineFormatting(text: string): string {
         // Order matters: Links, then Bold/Italic/Code
         let processed = text
            // Remove Images handled elsewhere (strict check to avoid removing text in brackets if not image)
            .replace(/!\[(.*?)\]\((.*?)\)/g, '')
            // Links
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:underline">$1</a>')
            // Bold: **text** or __text__
            .replace(/(\*\*|__)(.*?)\1/g, '<strong class="text-slate-100 font-bold">$2</strong>')
            // Italic: *text* or _text_
            .replace(/(\*|_)(.*?)\1/g, '<em>$2</em>')
            // Inline Code
            .replace(/`([^`]+)`/g, '<code class="bg-slate-700/50 text-amber-300 rounded-sm px-1 py-0.5 text-sm font-mono">$1</code>');
         return processed;
    }

    private renderList(listLines: string[], listType: 'ul' | 'ol'): string {
        const items = listLines.map(line => {
            // Remove bullet/number. Handle optional space for robustness.
            const itemContent = line.trim().replace(/^(\s*([-*]|\d+\.)\s*)/, '');
            return `<li class="mb-1 pl-1">${this.applyInlineFormatting(itemContent)}</li>`;
        }).join('');
        const listClasses = listType === 'ol' ? 'list-decimal list-inside ml-1' : 'list-disc list-inside ml-1';
        return `<${listType} class="${listClasses} space-y-2 my-4 text-slate-300">${items}</${listType}>`;
    }
    
    private renderCodeBlock(lines: string[]): string {
         const code = lines.join('\n')
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
         return `<pre class="bg-slate-950/50 p-4 rounded-lg overflow-x-auto my-4 border border-slate-800"><code class="text-sm font-mono text-slate-300">${code}</code></pre>`;
    }

    private parseTable(lines: string[]): string {
        if (lines.length < 2) {
            return lines.map(line => `<p>${this.applyInlineFormatting(line)}</p>`).join('');
        }
    
        const parseRow = (rowString: string): string[] => {
            const trimmed = rowString.trim();
            // Support tables with or without outer pipes
            const effectiveString = trimmed.startsWith('|') && trimmed.endsWith('|')
                ? trimmed.substring(1, trimmed.length - 1)
                : trimmed;
            return effectiveString.split('|').map(cell => cell.trim());
        };
    
        const headerCells = parseRow(lines[0]);
        // Skip separator line (lines[1])
        const bodyRows = lines.slice(2);
    
        const thead = `<thead><tr>${headerCells.map(cell => `<th class="border border-slate-600 bg-slate-800/60 px-4 py-3 text-left font-bold text-slate-200">${this.applyInlineFormatting(cell)}</th>`).join('')}</tr></thead>`;
    
        const tbody = `<tbody>${bodyRows.map((row, idx) => {
            const cells = parseRow(row);
            const bgClass = idx % 2 === 0 ? 'bg-slate-900/20' : 'bg-slate-800/20';
            return `<tr class="${bgClass}">${headerCells.map((_, i) => `<td class="border border-slate-700 px-4 py-3 text-slate-300 text-sm">${this.applyInlineFormatting(cells[i] || '')}</td>`).join('')}</tr>`;
        }).join('')}</tbody>`;
    
        return `<div class="overflow-x-auto my-6 rounded-lg border border-slate-700 shadow-sm"><table class="table-auto w-full border-collapse text-left">${thead}${tbody}</table></div>`;
    }

    public renderToHtml(): string {
        const markdown = this.content.trim();
        if (!markdown) return '';

        const lines = markdown.split('\n');
        const elements: string[] = [];
        let currentParagraph: string[] = [];
        let currentList: string[] = [];
        let currentListType: 'ul' | 'ol' | null = null;
        let inCodeBlock = false;
        let currentCodeBlockLines: string[] = [];
        
        const flushParagraph = () => {
            if (currentParagraph.length > 0) {
                elements.push(`<p class="mb-4 leading-relaxed text-slate-300">${this.applyInlineFormatting(currentParagraph.join(' '))}</p>`);
                currentParagraph = [];
            }
        };

        const flushList = () => {
            if (currentList.length > 0 && currentListType) {
                elements.push(this.renderList(currentList, currentListType));
                currentList = [];
                currentListType = null;
            }
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            // Code Block
            if (trimmedLine.startsWith('```')) {
                flushParagraph();
                flushList();
                if (inCodeBlock) {
                    // End code block
                    elements.push(this.renderCodeBlock(currentCodeBlockLines));
                    currentCodeBlockLines = [];
                    inCodeBlock = false;
                } else {
                    // Start code block
                    inCodeBlock = true;
                }
                continue;
            }

            if (inCodeBlock) {
                currentCodeBlockLines.push(line);
                continue;
            }

            // Headings
            const headingMatch = trimmedLine.match(/^(#{1,6})\s*(.*)$/); // Relaxed space check
            if (headingMatch) {
                flushParagraph();
                flushList();
                const level = headingMatch[1].length;
                const text = this.applyInlineFormatting(headingMatch[2]);
                const id = slugify(headingMatch[2]);
                const marginClass = level === 1 ? 'mb-6' : 'mt-8 mb-4';
                const textClass = level === 1 ? 'text-4xl font-extrabold' : level === 2 ? 'text-2xl font-bold text-indigo-400' : 'text-xl font-semibold text-slate-200';
                elements.push(`<h${level} id="${id}" class="${marginClass} ${textClass}">${text}</h${level}>`);
                continue;
            }

            // Tables
            if (trimmedLine.includes('|') && (
                (i + 1 < lines.length && lines[i + 1].trim().includes('---')) || // Header row
                (i > 0 && lines[i-1].trim().includes('---')) || // Body row after header
                (trimmedLine.includes('---') && trimmedLine.includes('|')) // Separator row
            )) {
                flushParagraph();
                flushList();
                
                // Identify table block boundaries
                let tableLines = [line];
                let j = i + 1;
                while(j < lines.length && lines[j].trim().includes('|')) {
                    tableLines.push(lines[j]);
                    j++;
                }
                i = j - 1; // Fast forward loop
                elements.push(this.parseTable(tableLines));
                continue;
            }

            // Lists
            const listMatch = trimmedLine.match(/^(\*|-|\d+\.)\s*(.*)$/); // Relaxed space check
            if (listMatch) {
                flushParagraph();
                const listType: 'ul' | 'ol' = (listMatch[1] === '*' || listMatch[1] === '-') ? 'ul' : 'ol';
                if (listType !== currentListType && currentListType !== null) {
                    flushList();
                }
                currentListType = listType;
                currentList.push(trimmedLine);
                continue;
            }
            
            // Blockquote
            const blockquoteMatch = trimmedLine.match(/^>\s?(.*)$/);
            if (blockquoteMatch) {
                flushParagraph();
                flushList();
                elements.push(`<blockquote class="border-l-4 border-indigo-500 pl-4 py-1 my-6 bg-slate-800/30 rounded-r italic text-slate-400"><p>${this.applyInlineFormatting(blockquoteMatch[1])}</p></blockquote>`);
                continue;
            }
            
            if (trimmedLine !== '') {
                flushList();
                currentParagraph.push(trimmedLine);
            } else {
                flushParagraph();
                flushList();
            }
        }

        flushParagraph();
        flushList();
        // Handle unclosed code block
        if (inCodeBlock) {
             elements.push(this.renderCodeBlock(currentCodeBlockLines));
        }

        return elements.join('');
    }

    public render(): React.ReactElement {
        const html = this.renderToHtml();
        const proseClasses = "prose prose-invert max-w-none";
        return <div className={proseClasses} dangerouslySetInnerHTML={{ __html: html }} />;
    }
}

const MarkdownComponent: React.FC<Props> = (props) => {
    return new MarkdownProcessor(props).render();
};

export default MarkdownComponent;
