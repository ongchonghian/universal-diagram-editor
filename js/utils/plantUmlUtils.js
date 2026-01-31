import { PLANTUML_SNIPPETS } from '../config.js';

/**
 * Filter snippets based on current context model
 * @param {Object} contextModel - The context model from the parser
 * @returns {Array} List of snippets applicable to the current context
 */
export const getPlantUmlSnippets = (contextModel) => {
    const common = PLANTUML_SNIPPETS.common || [];
    
    let effectiveModel = '';
    
    if (contextModel && contextModel.isInsideBlock) {
         effectiveModel = contextModel.model ? contextModel.model.toLowerCase() : '';
    } else {
         // Outside block. 
         effectiveModel = 'none'; 
    }

    let specificSnippets = [];

    if (effectiveModel.includes('sequence')) {
        specificSnippets = PLANTUML_SNIPPETS.sequence || [];
    } else if (effectiveModel.includes('class')) {
        specificSnippets = PLANTUML_SNIPPETS.class || [];
    } else if (effectiveModel.includes('use case')) {
        specificSnippets = PLANTUML_SNIPPETS.usecase || [];
    } else if (effectiveModel.includes('activity')) {
        specificSnippets = PLANTUML_SNIPPETS.activity || [];
    } else if (effectiveModel.includes('state')) {
        specificSnippets = PLANTUML_SNIPPETS.state || [];
    } else if (effectiveModel.includes('component')) {
        specificSnippets = PLANTUML_SNIPPETS.component || [];
    } else if (effectiveModel.includes('deployment')) {
        specificSnippets = PLANTUML_SNIPPETS.deployment || [];
    } else if (effectiveModel.includes('timing')) {
        specificSnippets = PLANTUML_SNIPPETS.timing || [];
    } else if (effectiveModel.includes('network')) {
        specificSnippets = PLANTUML_SNIPPETS.network || [];
    } else if (effectiveModel.includes('gantt')) {
        specificSnippets = PLANTUML_SNIPPETS.gantt || [];
    } else if (effectiveModel.includes('mindmap')) {
        specificSnippets = PLANTUML_SNIPPETS.mindmap || [];
    } else if (effectiveModel.includes('breakdown')) { // Work Breakdown Structure
        specificSnippets = PLANTUML_SNIPPETS.wbs || [];
    } else if (effectiveModel.includes('json')) {
        specificSnippets = PLANTUML_SNIPPETS.json || [];
    } else if (effectiveModel.includes('yaml')) {
        specificSnippets = PLANTUML_SNIPPETS.yaml || [];
    } else if (effectiveModel === 'none') {
        // Strictly hide tools if outside a block
        return [];
    } else {
        // Fallback
        return [...(PLANTUML_SNIPPETS.fallback || []), ...common];
    }
    
    // Return specific + common (Note/Title)
    return [...specificSnippets, ...common];
};
