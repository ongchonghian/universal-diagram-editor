/**
 * Turn pictures into image parts a model can read: a rendered SVG for render_diagram, and the photos
 * or screenshots a user attaches in the chat.
 *
 * Images are capped at MAX_SIDE pixels on the long side. Larger images cost more tokens without
 * helping the model, and some providers shrink them anyway.
 */

export const MAX_SIDE = 1568;
// Small diagrams are drawn larger, up to this factor, so their labels stay readable
const MAX_UPSCALE = 2;

/** Read a length attribute such as "120", "120px" or "120.5pt" as a number; null for "100%" or a missing value. */
function lengthOf(value) {
    const match = String(value ?? '').trim().match(/^([\d.]+)(px|pt)?$/);
    if (!match) return null;
    const n = parseFloat(match[1]) * (match[2] === 'pt' ? 4 / 3 : 1);
    return n > 0 ? n : null;
}

/**
 * The natural size of an SVG, from its width and height attributes, or else from its viewBox.
 * @returns {{ width: number, height: number } | null}
 */
export function svgSize(svgElementOrAttrs) {
    const get = (name) => (typeof svgElementOrAttrs.getAttribute === 'function' ? svgElementOrAttrs.getAttribute(name) : svgElementOrAttrs[name]);
    const viewBox = String(get('viewBox') || '').trim().split(/[\s,]+/).map(Number);
    const box = viewBox.length === 4 && viewBox[2] > 0 && viewBox[3] > 0 ? { width: viewBox[2], height: viewBox[3] } : null;
    const width = lengthOf(get('width'));
    const height = lengthOf(get('height'));
    if (width && height) return { width, height };
    if (box && width) return { width, height: width * (box.height / box.width) };
    if (box && height) return { width: height * (box.width / box.height), height };
    return box;
}

/** Scale a size so the long side is at most maxSide, and small sizes grow by up to MAX_UPSCALE. */
export function fitWithin(width, height, maxSide = MAX_SIDE, maxUpscale = MAX_UPSCALE) {
    const scale = Math.min(maxSide / Math.max(width, height), maxUpscale);
    return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

const loadImage = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('The browser could not load the picture.'));
    img.src = src;
});

/** Draw an image on a white canvas of the given size and return it as base64. */
function drawToBase64(img, width, height, mimeType) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    // toDataURL throws when the canvas is tainted, for example by an SVG that loads outside resources
    const url = canvas.toDataURL(mimeType, mimeType === 'image/jpeg' ? 0.9 : undefined);
    return url.slice(url.indexOf(',') + 1);
}

/**
 * Rasterise an SVG string to a PNG image part.
 * @returns {Promise<{ type: 'image', mimeType: 'image/png', data: string, width: number, height: number }>}
 */
export async function svgToPng(svg, { maxSide = MAX_SIDE } = {}) {
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const root = doc.documentElement;
    if (!root || root.nodeName.toLowerCase() !== 'svg' || doc.getElementsByTagName('parsererror').length) {
        throw new Error('The renderer did not return a readable SVG.');
    }
    const natural = svgSize(root) || { width: 800, height: 600 };
    const size = fitWithin(natural.width, natural.height, maxSide);
    // Give the SVG a fixed size, so the browser draws the picture at the size the canvas expects
    root.setAttribute('width', String(size.width));
    root.setAttribute('height', String(size.height));
    if (!root.getAttribute('viewBox')) root.setAttribute('viewBox', `0 0 ${natural.width} ${natural.height}`);
    root.removeAttribute('style');
    if (!root.getAttribute('xmlns')) root.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const text = new XMLSerializer().serializeToString(root);
    // A data: address rather than a blob: address, because some browsers taint the canvas for blob SVGs
    const img = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`);
    return { type: 'image', mimeType: 'image/png', data: drawToBase64(img, size.width, size.height, 'image/png'), ...size };
}

export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

/**
 * Turn an image file (pasted, dropped or attached) into an image part, scaled down to MAX_SIDE.
 * PNG files stay PNG, so screenshots keep sharp text; other formats become JPEG.
 * @returns {Promise<{ type: 'image', mimeType: string, data: string, width: number, height: number, name: string }>}
 */
export async function imageFileToPart(file, { maxSide = MAX_SIDE } = {}) {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) throw new Error(`${file.name || 'The file'} is not a PNG, JPEG, WebP or GIF picture.`);
    if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name || 'The picture'} is larger than 20 MB.`);
    const url = URL.createObjectURL(file);
    try {
        const img = await loadImage(url);
        const size = fitWithin(img.naturalWidth || img.width, img.naturalHeight || img.height, maxSide, 1);
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        return { type: 'image', mimeType, data: drawToBase64(img, size.width, size.height, mimeType), ...size, name: file.name || 'picture' };
    } finally {
        URL.revokeObjectURL(url);
    }
}
