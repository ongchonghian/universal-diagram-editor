/**
 * Render a diagram to SVG without touching the page.
 * A thin wrapper over RendererAdapter.render, shared by the evaluation set now and by the
 * render-and-look tool in a later phase.
 */
import { rendererAdapter } from '../RendererAdapter.js';

const SHAPE_ELEMENT = /<(rect|path|circle|ellipse|polygon|polyline|line|text|image)\b/i;

/** True when an SVG string holds at least one drawn shape or text element. */
export const svgHasContent = (svg) => typeof svg === 'string' && SHAPE_ELEMENT.test(svg);

/**
 * @returns {Promise<{ svg: string|null, error: string|null, skipped: boolean }>}
 */
export async function renderDiagram(code, type) {
    const rendered = await rendererAdapter.render(code, type);
    return {
        svg: rendered.svg || null,
        error: rendered.error ? rendered.error.message : null,
        skipped: !!rendered.skipped
    };
}
