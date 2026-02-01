
const code = `@startuml
timeline
    title NBC MVP Revised Execution Schedule (Feb 2026)

    section Week 1 - Data Structure & Configuration
        Feb 02 : Module 1: Feed Mixing Config (Ingredients Logic)
               : Module 4: SGR Implementation (Replace FCR)
        Feb 03 : Module 4: Fish Age Logic (Batch Creation Date)
               : Module 3: Dual Length Sampling (Standard vs Total)
        Feb 04 : Arista Farm Visit (Field Activity)
               : Unit Testing (Feed Ratios & SGR)
        Feb 05 : Module 6: Edit Fish Count (Non-mortality Adjustments)
        Feb 06 : Integration Test (Verify Feed Mixes in UI)
@enduml`;

const regex = /^(\s*(?!title|header|footer|legend|caption)(?:[^:\n]+)?\s*:\s*)(.+)$/gm;

console.log("Testing Regex Replacement...");
const fixed = code.replace(regex, (match, prefix, content) => {
    console.log(`Matched: "${match.trim()}"`);
    console.log(`Prefix: "${prefix}"`);
    console.log(`Content: "${content}"`);
    return prefix + content.replace(/:/g, ' -');
});

console.log("\n--- Fixed Code ---");
console.log(fixed);

if (fixed === code) {
    console.log("\nNO CHANGES MADE!");
} else {
    console.log("\nChanges detected.");
}
