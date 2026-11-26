
import fs from 'fs';
import path from 'path';

const inputFile = path.join(process.cwd(), 'plantuml_guide.txt');
const outputDir = path.join(process.cwd(), 'js/services/auto-fix/data');

const outputFileJson = path.join(outputDir, 'plantuml_syntax.json');
const outputFileCsv = path.join(process.cwd(), 'plantuml_syntax.csv');


if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

function parseGuide() {
    console.log(`Reading from ${inputFile}...`);
    try {
        const text = fs.readFileSync(inputFile, 'utf-8');
        const lines = text.split('\n');
        
        const entries = [];
        
        let currentTopic = 'General';
        let buffer = [];
        let codeBuffer = [];
        let inCode = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Detect Start of Code
            if (line.startsWith('@start') && !inCode) {
                inCode = true;
                codeBuffer.push(line);
                continue;
            }
            
            // Detect End of Code
            if (line.startsWith('@end') && inCode) {
                inCode = false;
                codeBuffer.push(line);
                
                // Finished a block. Save it.
                const description = cleanDescription(buffer.join(' '));
                const code = codeBuffer.join('\n'); 
                
                if (code.length > 0 && description.length > 0) {
                     entries.push({
                        topic: currentTopic,
                        description: description,
                        code: code,
                        keywords: extractKeywords(code)
                    });
                }
                
                // Reset buffers
                codeBuffer = [];
                buffer = [];
                continue;
            }
            
            if (inCode) {
                codeBuffer.push(lines[i]); // Keep original indentation
                continue;
            }
            
            // Detect Topic (Basic heuristic)
            if (/^\d+\.\d+/.test(line)) {
                currentTopic = line.replace(/^\d+(\.\d+)*\s*/, '');
                if (!currentTopic && i + 1 < lines.length) {
                     currentTopic = lines[i+1].trim();
                     i++;
                }
            }
            
            // Skip page footers/headers artifacts
            if (line.includes('PlantUML Language Reference Guide') || /^\d+\s*\/\s*\d+$/.test(line)) {
                continue;
            }
            if (line.length < 3) continue;
            
            buffer.push(line);
        }
        
        // Write JSON
        fs.writeFileSync(outputFileJson, JSON.stringify(entries, null, 2));
        console.log(`Generated ${entries.length} syntax entries in ${outputFileJson}`);

        // Write CSV
        const csvHeader = 'Topic,Description,Code\n';
        const csvContent = entries.map(e => {
            const topic = `"${e.topic.replace(/"/g, '""')}"`;
            const description = `"${e.description.replace(/"/g, '""')}"`;
            const code = `"${e.code.replace(/"/g, '""')}"`;
            return `${topic},${description},${code}`;
        }).join('\n');
        
        fs.writeFileSync(outputFileCsv, csvHeader + csvContent);
        console.log(`Generated ${entries.length} syntax entries in ${outputFileCsv}`);
    } catch (err) {
        console.error("Error processing file:", err);
    }
}

function cleanDescription(text) {
    return text.replace(/\s+/g, ' ').substring(0, 1000);
}

function extractKeywords(code) {
    // Simple extraction of potential keywords from the code
    const words = code.match(/\b\w+\b/g) || [];
    // Filter out common useless words or keep all? 
    // Let's keep unique words longer than 2 chars
    return [...new Set(words.filter(w => w.length > 2))]; 
}

parseGuide();
