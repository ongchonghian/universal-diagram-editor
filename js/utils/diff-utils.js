
/* eslint-disable no-unused-vars */
import * as BpmnDifferPkg from 'bpmn-js-differ';
// Safe extraction of diff function due to CJS/ESM interop
const diff = BpmnDifferPkg.diff 
          || (BpmnDifferPkg.default && BpmnDifferPkg.default.diff) 
          || BpmnDifferPkg.default 
          || BpmnDifferPkg;

export const diffUtils = {
    async generateSemanticDiff(oldCode, newCode, diagramType) {
        if (!oldCode || !newCode) {
            return { diffCode: null, visualDiffSupported: false, diffData: null };
        }

        if (diagramType === 'bpmn') {
            return await this._generateBpmnDiff(oldCode, newCode);
        } else if (diagramType === 'mermaid') {
            return this._generateMermaidDiff(oldCode, newCode);
        } else if (diagramType === 'plantuml') {
            return this._generatePlantUmlDiff(oldCode, newCode);
        }

        return { diffCode: null, visualDiffSupported: false, diffData: null };
    },

    async _generateBpmnDiff(oldXml, newXml) {
        try {
            const [oldDefinitions, newDefinitions] = await Promise.all([
                this._parseBpmn(oldXml),
                this._parseBpmn(newXml)
            ]);

            const changes = diff(oldDefinitions, newDefinitions);

            return {
                diffCode: null,
                visualDiffSupported: true,
                diffData: changes
            };
        } catch (e) {
            console.error("BPMN Diff Error:", e);
            return { diffCode: null, visualDiffSupported: false, diffData: null };
        }
    },

    async _parseBpmn(xml) {
        // Dynamic import to avoid top-level CJS instantiation issues
        const moddlePkg = await import('bpmn-moddle');
        const BpmnModdle = moddlePkg.default || moddlePkg;
        const moddle = new BpmnModdle();
        
        const { rootElement } = await moddle.fromXML(xml);
        return rootElement;
    },

    _generateMermaidDiff(oldCode, newCode) {
        try {
            const oldLines = oldCode.split('\n').map(l => l.trim()).filter(l => l);
            const newLines = newCode.split('\n').map(l => l.trim()).filter(l => l);
            
            const addedLines = newLines.filter(x => !oldLines.includes(x));
            const removedLines = oldLines.filter(x => !newLines.includes(x));

            const addedIds = new Set();
            const removedIds = new Set();

            const nodeRegex = /^([a-zA-Z0-9_]+)(\[|\(|\{|\>|\s)/;
            const keywords = ['graph', 'flowchart', 'subgraph', 'classDef', 'class', 'style', 'click', 'linkStyle', 'end'];

            addedLines.forEach(line => {
                const match = line.match(nodeRegex);
                if (match && !keywords.includes(match[1])) {
                    addedIds.add(match[1]);
                }
            });

            removedLines.forEach(line => {
                const match = line.match(nodeRegex);
                if (match && !keywords.includes(match[1])) {
                    removedIds.add(match[1]);
                }
            });

            let hybridCode = newCode + '\n\n%% --- DIFF STYLES ---\n';
            hybridCode += 'classDef diffAdd fill:#e6fffa,stroke:#00aa00,stroke-width:2px;\n';
            hybridCode += 'classDef diffRem fill:#ffe6e6,stroke:#aa0000,stroke-width:2px,stroke-dasharray: 5 5;\n';

            if (addedIds.size > 0) {
                hybridCode += `class ${Array.from(addedIds).join(',')} diffAdd;\n`;
            }

            removedLines.forEach(line => {
                const match = line.match(nodeRegex);
                if (match && !keywords.includes(match[1])) {
                    const id = match[1];
                    const defMatch = line.match(/^[a-zA-Z0-9_]+([\[\(\{\>].*?[\]\)\}\>]|)/);
                    if (defMatch) {
                        hybridCode += `${defMatch[0]}\n`;
                        hybridCode += `class ${id} diffRem;\n`;
                    }
                }
            });

            return {
                diffCode: hybridCode,
                visualDiffSupported: true,
                diffData: { added: Array.from(addedIds), removed: Array.from(removedIds) }
            };

        } catch (e) {
            console.warn("Mermaid Diff Failed:", e);
            return { diffCode: null, visualDiffSupported: false, diffData: null };
        }
    },

    _generatePlantUmlDiff(oldCode, newCode) {
        try {
            const oldLines = oldCode.split('\n').map(l => l.trim()).filter(l => l);
            const newLines = newCode.split('\n').map(l => l.trim()).filter(l => l);
            
            const addedLines = newLines.filter(x => !oldLines.includes(x));
            const removedLines = oldLines.filter(x => !newLines.includes(x));

            const addedIds = new Set();
            const removedIds = new Set();

            const entityRegex = /^(class|participant|component|rectangle|agent|boundary|control|entity|database|queue|stack|node|cloud|frame|package|folder|file|artifact|card|hexagon|person|system)\s+"?([a-zA-Z0-9_]+)"?/;
            const aliasRegex = /^(?:participant|component|node)\s+".*?"\s+as\s+([a-zA-Z0-9_]+)/;

            const extractId = (line) => {
                let m = line.match(aliasRegex);
                if (m) return m[1];
                m = line.match(entityRegex);
                if (m) return m[2];
                return null;
            };

            addedLines.forEach(line => {
                const id = extractId(line);
                if (id) addedIds.add(id);
            });
            removedLines.forEach(line => {
                const id = extractId(line);
                if (id) removedIds.add(id);
            });

            let hybridCode = newCode;
            const endIdx = hybridCode.lastIndexOf('@enduml');
            let insertion = '\n\' --- DIFF STYLES ---\n';

            addedIds.forEach(id => {
                insertion += `style ${id} #line:green;back:e6fffa\n`;
            });

            removedLines.forEach(line => {
                const id = extractId(line);
                if (id) {
                    insertion += `${line}\n`;
                    insertion += `style ${id} #line:red;line.dashed;back:ffe6e6\n`;
                }
            });

            if (endIdx !== -1) {
                hybridCode = hybridCode.substring(0, endIdx) + insertion + '\n@enduml';
            } else {
                hybridCode += insertion;
            }

            return {
                diffCode: hybridCode,
                visualDiffSupported: true,
                diffData: { added: Array.from(addedIds), removed: Array.from(removedIds) }
            };

        } catch (e) {
             console.warn("PlantUML Diff Failed:", e);
             return { diffCode: null, visualDiffSupported: false, diffData: null };
        }
    }
};
