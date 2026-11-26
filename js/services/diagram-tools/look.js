/**
 * Render a diagram and turn the picture into a PNG image part, for Smith's render_diagram tool.
 */
import { renderDiagram } from './render.js';
import { svgToPng } from './rasterise.js';

/**
 * @returns {Promise<{ image: object, width: number, height: number } | { error: string }>}
 */
export async function lookAtDiagram(code, type) {
    const rendered = await renderDiagram(code, type);
    if (rendered.skipped) return { error: 'This diagram type is drawn by its own visual editor, so the picture cannot be rendered here.' };
    if (rendered.error || !rendered.svg) return { error: rendered.error || 'The renderer returned no picture.' };
    try {
        const image = await svgToPng(rendered.svg);
        return { image: { type: 'image', mimeType: image.mimeType, data: image.data }, width: image.width, height: image.height };
    } catch (e) {
        return { error: `The picture rendered but could not be converted to an image: ${e?.message || e}` };
    }
}
