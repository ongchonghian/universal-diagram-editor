/**
 * Universal Error Classifier
 * Buckets specific tool errors into universal types.
 */

export const ERROR_KINDS = {
    PARSE: 'PARSE',       // grammar/token
    REFERENCE: 'REFERENCE', // missing IDs/nodes
    VERSION: 'VERSION',     // unsupported feature
    DI_LAYOUT: 'DI_LAYOUT', // BPMN DI issues
    RENDERER: 'RENDERER',   // engine-specific quirks
    UNKNOWN: 'UNKNOWN'
};

export class ErrorClassifier {
    static classify(error, language) {
        // Allow adapters to pre-classify, but if UNKNOWN, try heuristics here
        if (error.kind && error.kind !== 'UNKNOWN') return error.kind;

        const msg = (error.message || '').toLowerCase();

        // Universal heuristics
        if (msg.includes('syntax') || msg.includes('parse') || msg.includes('unexpected') || msg.includes('token')) {
            return ERROR_KINDS.PARSE;
        }

        if (msg.includes('not found') || msg.includes('undefined') || msg.includes('missing id')) {
            return ERROR_KINDS.REFERENCE;
        }
        
        if (msg.includes('version') || msg.includes('support')) {
            return ERROR_KINDS.VERSION;
        }

        // Language specific
        if (language === 'bpmn') {
            if (msg.includes('bounds') || msg.includes('diagram layout')) return ERROR_KINDS.DI_LAYOUT;
        }

        return ERROR_KINDS.UNKNOWN;
    }
}
