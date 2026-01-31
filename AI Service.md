/**
 * AI Service for Universal Diagram Editor
 * Handles communication with Google Gemini API for diagram generation and analysis.
 */

const apiKey = ""; // API Key provided by execution environment

// System instructions to guide the AI's behavior
const SYSTEM_PROMPT = `You are an expert Diagram Architect and Technical Illustrator. 
Your goal is to generate syntactically correct, strictly formatted code for diagrams based on user requests.
You typically work with Mermaid.js, BPMN (XML), and Vega-Lite.

RULES:
1. Return ONLY the raw code for the diagram. Do not include markdown code fences (like \`\`\`mermaid) unless explicitly requested.
2. If the user asks for a specific diagram type (e.g., "Sequence diagram"), ensure the syntax is valid for that specific renderer.
3. For BPMN, ensure the XML is valid BPMN 2.0.
4. If explaining a diagram, be concise, professional, and focus on the business logic or data flow.
5. If the request is ambiguous, default to a Mermaid Flowchart.
`;

/**
 * Generates diagram code based on a natural language prompt.
 * @param {string} prompt - The user's description of the diagram.
 * @param {string} contextType - The current editor type (e.g., 'mermaid', 'bpmn', 'vega').
 * @returns {Promise<string>} - The generated code.
 */
export async function generateDiagram(prompt, contextType = 'mermaid') {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Context: User is using the ${contextType} editor.\nRequest: ${prompt}\n\nGenerate the code for this diagram. Return ONLY the code.`
            }]
          }],
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }]
          },
          generationConfig: {
            temperature: 0.2, // Low temperature for more deterministic code generation
            maxOutputTokens: 2048,
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Cleanup: Remove markdown code fences if the AI included them despite instructions
    text = text.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');

    return text.trim();
  } catch (error) {
    console.error("AI Generation failed:", error);
    throw error;
  }
}

/**
 * Explains or critiques the provided diagram code.
 * @param {string} code - The raw diagram code/XML.
 * @param {string} type - The diagram type.
 * @returns {Promise<string>} - The explanation.
 */
export async function explainDiagram(code, type) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Analyze this ${type} diagram code:\n\n${code}\n\nProvide a concise summary of the process flow and identify any potential logic errors or deadlocks.`
            }]
          }],
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }]
          }
        })
      }
    );

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Could not analyze diagram.";
  } catch (error) {
    return "Error analyzing diagram. Please check your connection.";
  }
}