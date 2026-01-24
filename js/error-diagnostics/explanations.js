// Error Explanations Database
// Human-readable explanations with examples for common syntax errors

/**
 * Error explanations indexed by error code
 * Each explanation includes:
 * - title: Short title for the error
 * - description: Detailed explanation
 * - example: Code example showing correct syntax
 * - docLink: Optional link to documentation
 */
const ERROR_EXPLANATIONS = {
    // Mermaid errors
    'mermaid-missing-bracket': {
        title: 'Missing Closing Bracket',
        description: 'Node labels in Mermaid flowcharts use brackets to define the label text. Each opening bracket must have a matching closing bracket.',
        example: `flowchart TD
    A[This is correct]
    B[Label with
       multiple lines]
    C[Another node]`,
        docLink: 'https://mermaid.js.org/syntax/flowchart.html#node-shapes'
    },
    'mermaid-missing-paren': {
        title: 'Missing Closing Parenthesis',
        description: 'Parentheses in Mermaid are used for rounded/stadium-shaped nodes. Make sure each opening parenthesis has a closing one.',
        example: `flowchart TD
    A(Rounded node)
    B((Circle node))
    C([Stadium shape])`,
        docLink: 'https://mermaid.js.org/syntax/flowchart.html#node-shapes'
    },
    'mermaid-missing-brace': {
        title: 'Missing Closing Brace',
        description: 'Braces in Mermaid define diamond/rhombus nodes used for decisions. Ensure all braces are properly closed.',
        example: `flowchart TD
    A{Decision?}
    A -->|Yes| B[Action]
    A -->|No| C[Other]`,
        docLink: 'https://mermaid.js.org/syntax/flowchart.html#node-shapes'
    },
    'mermaid-invalid-arrow': {
        title: 'Invalid Arrow Syntax',
        description: 'Mermaid uses specific arrow syntax for connections between nodes. Common arrows include --> (solid), -.-> (dotted), and ==> (thick).',
        example: `flowchart TD
    A --> B       %% Solid arrow
    B -.-> C      %% Dotted arrow
    C ==> D       %% Thick arrow
    D --text--> E %% Arrow with text
    E -->|text| F %% Alternative text syntax`,
        docLink: 'https://mermaid.js.org/syntax/flowchart.html#links-between-nodes'
    },
    'mermaid-unexpected-token': {
        title: 'Unexpected Token',
        description: 'The parser encountered a character or word it did not expect at this position. This often happens when syntax is incomplete or incorrect.',
        example: `flowchart TD
    %% Each statement on its own line
    A[Start] --> B[Process]
    B --> C{Decision}
    C -->|Yes| D[End]`,
        docLink: 'https://mermaid.js.org/syntax/flowchart.html'
    },
    'mermaid-unrecognized-text': {
        title: 'Unrecognized Text',
        description: 'The parser could not understand part of your diagram. Check for typos in keywords or invalid syntax.',
        example: `%% Valid diagram types:
sequenceDiagram
flowchart TD
classDiagram
stateDiagram-v2
erDiagram`,
        docLink: 'https://mermaid.js.org/intro/'
    },
    'mermaid-unknown-diagram': {
        title: 'Unknown Diagram Type',
        description: 'Mermaid diagrams must start with a valid diagram type declaration. Check that you have spelled the diagram type correctly.',
        example: `%% Valid diagram declarations:
flowchart TD
flowchart LR
sequenceDiagram
classDiagram
stateDiagram-v2
erDiagram
gantt
pie`,
        docLink: 'https://mermaid.js.org/intro/'
    },

    // PlantUML errors
    'plantuml-missing-start': {
        title: 'Missing @startuml',
        description: 'Every PlantUML diagram must begin with @startuml. This tells the parser where the diagram starts.',
        example: `@startuml
Alice -> Bob: Hello
Bob --> Alice: Hi there!
@enduml`,
        docLink: 'https://plantuml.com/starting'
    },
    'plantuml-missing-end': {
        title: 'Missing @enduml',
        description: 'Every PlantUML diagram must end with @enduml. This marks the end of the diagram definition.',
        example: `@startuml
class Animal {
  +name: String
  +makeSound()
}
@enduml`,
        docLink: 'https://plantuml.com/starting'
    },
    'plantuml-invalid-arrow': {
        title: 'Invalid Arrow Syntax',
        description: 'PlantUML uses specific arrow notation. In sequence diagrams, -> is a synchronous message, --> is a response, and ->> is asynchronous.',
        example: `@startuml
Alice -> Bob: sync message
Bob --> Alice: response
Alice ->> Charlie: async message
Alice ->x Bob: lost message
@enduml`,
        docLink: 'https://plantuml.com/sequence-diagram'
    },
    'plantuml-missing-bracket': {
        title: 'Missing Closing Bracket',
        description: 'Brackets in PlantUML define stereotypes, notes, and other elements. Ensure all brackets are properly closed.',
        example: `@startuml
class MyClass <<singleton>> {
  +getInstance(): MyClass
}
note right of MyClass: This is a note
@enduml`,
        docLink: 'https://plantuml.com/class-diagram'
    },

    // GraphViz errors
    'graphviz-missing-bracket': {
        title: 'Missing Closing Bracket',
        description: 'GraphViz uses brackets for node and edge attributes. Each opening bracket must have a closing bracket.',
        example: `digraph G {
    A [label="Node A" shape=box]
    B [label="Node B" color=red]
    A -> B [style=dashed]
}`,
        docLink: 'https://graphviz.org/doc/info/attrs.html'
    },
    'graphviz-missing-brace': {
        title: 'Missing Closing Brace',
        description: 'GraphViz graph definitions are enclosed in braces. Make sure you have a closing brace at the end.',
        example: `digraph G {
    rankdir=LR
    A -> B -> C
    B -> D
}`,
        docLink: 'https://graphviz.org/doc/info/lang.html'
    },
    'graphviz-syntax-error': {
        title: 'Syntax Error',
        description: 'GraphViz encountered invalid syntax. Common issues include missing semicolons, invalid attributes, or incorrect graph type.',
        example: `digraph G {
    // Node definitions
    start [shape=circle]
    end [shape=doublecircle]
    
    // Edges
    start -> process -> end;
}`,
        docLink: 'https://graphviz.org/doc/info/lang.html'
    },

    // BPMN/XML errors
    'bpmn-xml-error': {
        title: 'XML Parsing Error',
        description: 'BPMN files use XML format. The error indicates malformed XML - check for unclosed tags, invalid characters, or missing quotes around attributes.',
        example: `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <process id="Process_1" isExecutable="true">
    <startEvent id="Start_1"/>
    <endEvent id="End_1"/>
  </process>
</definitions>`,
        docLink: 'https://www.omg.org/spec/BPMN/2.0/'
    },
    'bpmn-unclosed-tag': {
        title: 'Unclosed XML Tag',
        description: 'XML tags must be properly closed. Either use a closing tag </element> or self-close with />.',
        example: `<!-- Self-closing tag -->
<startEvent id="Start_1"/>

<!-- Tag with closing -->
<task id="Task_1">
  <incoming>Flow_1</incoming>
</task>`,
        docLink: 'https://www.omg.org/spec/BPMN/2.0/'
    },

    // C4 PlantUML errors
    'c4plantuml-missing-bracket': {
        title: 'Missing Closing Bracket',
        description: 'C4 diagrams use PlantUML syntax. Ensure all brackets in function calls and labels are properly closed.',
        example: `@startuml
!include C4_Container.puml

Person(user, "User", "A user of the system")
Container(web, "Web App", "React", "The main web application")
Rel(user, web, "Uses", "HTTPS")
@enduml`,
        docLink: 'https://github.com/plantuml-stdlib/C4-PlantUML'
    },

    // Generic errors
    'generic-syntax-error': {
        title: 'Syntax Error',
        description: 'There is a syntax error in your diagram code. Check the line indicated for typos, missing characters, or invalid syntax.',
        example: 'Review your code for common issues:\n- Missing closing brackets or braces\n- Typos in keywords\n- Invalid characters\n- Incorrect indentation'
    },
    'generic-missing-bracket': {
        title: 'Missing Bracket',
        description: 'A bracket ([ ]) is missing or mismatched. Make sure every opening bracket has a corresponding closing bracket.',
        example: 'Check that brackets are balanced:\n[correct]\n[[nested correct]]\n[missing close   <- Error!'
    },
    'generic-missing-paren': {
        title: 'Missing Parenthesis',
        description: 'A parenthesis ( ) is missing or mismatched. Ensure all parentheses are properly paired.',
        example: 'Check that parentheses are balanced:\n(correct)\n((nested correct))\n(missing close   <- Error!'
    },
    'generic-missing-brace': {
        title: 'Missing Brace',
        description: 'A brace { } is missing or mismatched. Make sure every opening brace has a closing brace.',
        example: 'Check that braces are balanced:\n{correct}\n{{nested correct}}\n{missing close   <- Error!'
    }
};

/**
 * Get error explanation for a given error code and message
 * @param {string} code - Error code (e.g., 'mermaid-missing-bracket')
 * @param {string} message - Original error message
 * @returns {Object} Explanation object with title, description, example, docLink
 */
export function getErrorExplanation(code, message) {
    // Try exact code match first
    if (code && ERROR_EXPLANATIONS[code]) {
        return ERROR_EXPLANATIONS[code];
    }

    // Try to find a matching explanation based on error patterns
    const lowerMessage = (message || '').toLowerCase();
    
    // Pattern-based matching
    const patternMatches = [
        { pattern: /missing.*bracket|\].*expected|unclosed.*bracket/i, code: 'generic-missing-bracket' },
        { pattern: /missing.*parenthesis|\).*expected|unclosed.*paren/i, code: 'generic-missing-paren' },
        { pattern: /missing.*brace|\}.*expected|unclosed.*brace/i, code: 'generic-missing-brace' },
        { pattern: /syntax\s+error/i, code: 'generic-syntax-error' },
        { pattern: /@enduml.*missing|missing.*@enduml/i, code: 'plantuml-missing-end' },
        { pattern: /@startuml.*missing|missing.*@startuml/i, code: 'plantuml-missing-start' },
        { pattern: /invalid.*arrow|arrow.*syntax|unknown.*link/i, code: 'mermaid-invalid-arrow' },
        { pattern: /unexpected.*token/i, code: 'mermaid-unexpected-token' },
        { pattern: /xml.*error|parsing.*xml|malformed.*xml/i, code: 'bpmn-xml-error' },
    ];

    for (const { pattern, code: matchCode } of patternMatches) {
        if (pattern.test(lowerMessage) && ERROR_EXPLANATIONS[matchCode]) {
            return ERROR_EXPLANATIONS[matchCode];
        }
    }

    // Default generic explanation
    return {
        title: 'Diagram Error',
        description: 'An error occurred while parsing your diagram. Review the error message for details and check your syntax.',
        example: 'Common issues to check:\n- Spelling of keywords\n- Matching brackets and braces\n- Valid arrow syntax\n- Required start/end tags'
    };
}

/**
 * Format explanation for Monaco hover display
 * @param {Object} explanation - Explanation object
 * @returns {Array} Array of Monaco hover content objects
 */
export function formatForHover(explanation) {
    const contents = [];
    
    if (explanation.title) {
        contents.push({ value: `**${explanation.title}**` });
    }
    
    if (explanation.description) {
        contents.push({ value: explanation.description });
    }
    
    if (explanation.example) {
        contents.push({ value: '**Example:**' });
        contents.push({ value: '```\n' + explanation.example + '\n```' });
    }
    
    if (explanation.docLink) {
        contents.push({ value: `[Documentation](${explanation.docLink})` });
    }
    
    return contents;
}

export default { getErrorExplanation, formatForHover, ERROR_EXPLANATIONS };
