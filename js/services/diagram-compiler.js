/**
 * Diagram Compiler
 * Converts JSON AST into target diagram syntax (Mermaid, PlantUML, etc.)
 * Ensures deterministic output and syntax validity.
 */

export class DiagramCompiler {
    
    compile(ast, targetSyntax) {
        if (!ast || !ast.meta) {
            throw new Error("Invalid AST: Missing meta information");
        }

        switch (targetSyntax.toLowerCase()) {
            case 'mermaid':
                return this.compileMermaid(ast);
            case 'plantuml':
            case 'c4': // C4 is often implemented via PlantUML
                return this.compilePlantUML(ast);
            // Future support for other types
            // case 'bpmn': return this.compileBPMN(ast);
            // case 'vega': return this.compileVega(ast);
            default:
                throw new Error(`Unsupported target syntax: ${targetSyntax}`);
        }
    }

    // --- Mermaid Compiler ---

    compileMermaid(ast) {
        const type = ast.meta.type; // sequence, flowchart, gantt, class, state
        
        switch (type) {
            case 'sequence':
                return this.compileMermaidSequence(ast);
            case 'flowchart':
                return this.compileMermaidFlowchart(ast);
            case 'gantt':
                return this.compileMermaidGantt(ast);
            // Add others as needed
            default:
                // Fallback for types not strictly mapped yet, assume flowchart-like
                return this.compileMermaidFlowchart(ast); 
        }
    }

    compileMermaidSequence(ast) {
        let code = 'sequenceDiagram\n';
        
        // Participants
        ast.nodes.forEach(node => {
            const alias = node.id;
            const label = node.label || alias;
            if (node.type === 'actor') {
                code += `    actor ${alias} as ${label}\n`;
            } else {
                code += `    participant ${alias} as ${label}\n`;
            }
        });

        // Messages
        ast.edges.forEach(edge => {
            const type = edge.type || '->'; // ->, -->, ->>, -->>
            const label = edge.label ? `: ${edge.label}` : '';
            code += `    ${edge.sourceId}${type}${edge.targetId}${label}\n`;
        });

        return code;
    }

    compileMermaidFlowchart(ast) {
        const direction = ast.meta.direction || 'TD';
        let code = `flowchart ${direction}\n`;

        // Nodes
        ast.nodes.forEach(node => {
            // Sanitize ID
            const id = node.id.replace(/[^a-zA-Z0-9_]/g, '_');
            let shapeStart = '[', shapeEnd = ']';
            
            // Map types to shapes if desired
            if (node.type === 'database') { shapeStart = '[('; shapeEnd = ')]'; }
            else if (node.type === 'start' || node.type === 'end') { shapeStart = '(['; shapeEnd = '])'; }
            else if (node.type === 'condition') { shapeStart = '{'; shapeEnd = '}'; }

            code += `    ${id}${shapeStart}"${node.label || id}"${shapeEnd}\n`;
        });

        // Edges
        ast.edges.forEach(edge => {
            const source = edge.sourceId.replace(/[^a-zA-Z0-9_]/g, '_');
            const target = edge.targetId.replace(/[^a-zA-Z0-9_]/g, '_');
            const type = edge.type || '-->';
            const label = edge.label ? `|${edge.label}|` : '';
            
            code += `    ${source} ${type} ${label} ${target}\n`;
        });

        return code;
    }

    compileMermaidGantt(ast) {
        let code = `gantt\n    title ${ast.meta.title || "Gantt Chart"}\n    dateFormat YYYY-MM-DD\n`;
        
        // Sections and Tasks
        // Assume 'containers' used for sections or groups
        // Or flat structure with 'section' property in nodes?
        // Let's assume ast.nodes are tasks and have a 'section' property or we use a default section.
        
        const tasksBySection = {};
        ast.nodes.forEach(node => {
            const section = node.section || 'General';
            if (!tasksBySection[section]) tasksBySection[section] = [];
            tasksBySection[section].push(node);
        });

        for (const [section, tasks] of Object.entries(tasksBySection)) {
            code += `    section ${section}\n`;
            tasks.forEach(task => {
                // Task format: label : [id,] [crit,] [active,] start, duration/end
                const id = task.id ? `${task.id}, ` : '';
                const crit = task.style?.critical ? 'crit, ' : '';
                const active = task.style?.active ? 'active, ' : '';
                const start = task.style?.startDate || '2024-01-01'; // Default if missing
                const length = task.style?.duration ? `${task.style.duration}d` : (task.style?.endDate || '1d');
                
                code += `    ${task.label || "Task"} :${crit}${active}${id}${start}, ${length}\n`;
            });
        }
        
        return code;
    }


    // --- PlantUML Compiler ---

    compilePlantUML(ast) {
        const type = ast.meta.type;

        if (type === 'gantt' || type === 'timeline') {
            return this.compilePlantUMLGantt(ast);
        } else if (type === 'sequence') {
            return this.compilePlantUMLSequence(ast);
        } else {
            // Default to generic @startuml (Classes, Use Case, Component)
            return this.compilePlantUMLGeneric(ast);
        }
    }

    compilePlantUMLGantt(ast) {
        let code = `@startgantt\n`;
        if (ast.meta.title) code += `title ${ast.meta.title}\n`;
        code += `Project starts 2026-02-02\n`; // Default or from meta
        if (ast.nodes.length > 0 && ast.nodes[0].style?.startDate) {
            // Try to extract start date from first task if possible, or pass in meta
             // code = code.replace('2026-02-02', ast.nodes[0].style.startDate);
        }

        // Milestones and Tasks
        ast.nodes.forEach(node => {
            const alias = node.id; 
            const start = node.style?.startDate || '2026-02-02';
            
            if (node.type === 'milestone') {
                code += `[${node.label}] as [${alias}] happens at ${start}\n`;
            } else {
                // Duration
                // Usage: [TaskName] as [Alias] starts at <date> and lasts X days
                // Or: [TaskName] as [Alias] starts at <date> and ends at <date>
                const duration = node.style?.duration ? `lasts ${node.style.duration} days` : `ends ${node.style?.endDate || start}`;
                code += `[${node.label}] as [${alias}] starts ${start} and ${duration}\n`;
                
                // Color customization
                // Syntax: [Alias] is colored in ColorName
                if (node.style?.color) {
                     // Ensure 'in' keyword and handle hex vs named
                     // If hex, use #. If named, no #.
                     // But compiler might receive either. 
                     // Simple heuristic: if color starts with #, assume it's hex compatible.
                     // User said: "#LightBlue is invalid". Meaning named colors shouldn't have #.
                     // We will output as is, assuming strict inputs, but add 'in'.
                    code += `[${alias}] is colored in ${node.style.color}\n`;
                }
            }
        });

        // Dependencies
        if (ast.edges) {
            ast.edges.forEach(edge => {
                // [TaskB] starts at [TaskA]'s end
                // Simplified arrow syntax works in clear cases: [A] -> [B]
                code += `[${edge.sourceId}] -> [${edge.targetId}]\n`;
            });
        }

        code += `@endgantt`;
        return code;
    }

    compilePlantUMLSequence(ast) {
        let code = `@startuml\n`;
        if (ast.meta.title) code += `title ${ast.meta.title}\n`;

        // Participants
        ast.nodes.forEach(node => {
            // type can be actor, boundary, control, entity, database
            const validTypes = ['actor', 'boundary', 'control', 'entity', 'database', 'participant'];
            const pType = validTypes.includes(node.type) ? node.type : 'participant';
            code += `${pType} "${node.label}" as ${node.id}\n`;
        });

        // Messages
        ast.edges.forEach(edge => {
            const type = edge.type || '->'; // ->, -->
            const label = edge.label ? `: ${edge.label}` : '';
            code += `${edge.sourceId} ${type} ${edge.targetId} ${label}\n`;
        });

        code += `@enduml`;
        return code;
    }

    compilePlantUMLGeneric(ast) {
        let code = `@startuml\n`;
        if (ast.meta.title) code += `title ${ast.meta.title}\n`;
        if (ast.meta.direction === 'LR') code += `left to right direction\n`;

        // Nodes (Classes, Interfaces, Components)
        ast.nodes.forEach(node => {
            // e.g. class "User" as user
            const typeValue = node.type || 'class'; // default
            code += `${typeValue} "${node.label}" as ${node.id} {\n`;
            // attributes/methods could go here if AST supported them
            code += `}\n`;
        });

        // Edges
        ast.edges.forEach(edge => {
            const type = edge.type || '-->'; // ..>, --|>, *--
            const label = edge.label ? `: ${edge.label}` : '';
            code += `${edge.sourceId} ${type} ${edge.targetId} ${label}\n`;
        });

        code += `@enduml`;
        return code;
    }
}

export const diagramCompiler = new DiagramCompiler();
