import { describe, it, expect } from 'vitest';
import { extractCodeBlock, extractCodeBlocks } from './code-extract.js';

describe('extractCodeBlock', () => {
    it.each([
        ['no fence', 'Here is an explanation with no code.', null],
        ['one fence with a label', 'Text\n```mermaid\nflowchart TD\n  A --> B\n```\nMore', { lang: 'mermaid', code: 'flowchart TD\n  A --> B' }],
        ['a fence without a label', '```\ndigraph { a -> b }\n```', { lang: '', code: 'digraph { a -> b }' }],
        ['a fence without a final newline', '```plantuml\n@startuml\nA -> B\n@enduml```', { lang: 'plantuml', code: '@startuml\nA -> B\n@enduml' }],
        ['Windows line endings', '```bpmn\r\n<definitions/>\r\n```', { lang: 'bpmn', code: '<definitions/>' }],
        ['a label with a hyphen', '```vega-lite\n{"mark":"bar"}\n```', { lang: 'vega-lite', code: '{"mark":"bar"}' }]
    ])('handles %s', (_name, text, expected) => {
        const block = extractCodeBlock(text);
        if (expected === null) expect(block).toBeNull();
        else expect(block).toMatchObject(expected);
    });

    it('picks the longest block when a reply holds two fences', () => {
        const text = 'Example:\n```mermaid\nA-->B\n```\nFull diagram:\n```mermaid\nflowchart TD\n  A --> B\n  B --> C\n```';
        expect(extractCodeBlock(text).code).toBe('flowchart TD\n  A --> B\n  B --> C');
        expect(extractCodeBlocks(text)).toHaveLength(2);
    });

    it('skips an empty fence', () => {
        expect(extractCodeBlocks('```\n\n```')).toEqual([]);
    });
});
