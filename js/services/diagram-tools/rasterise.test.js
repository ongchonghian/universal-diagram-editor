import { describe, it, expect } from 'vitest';
import { svgSize, fitWithin, MAX_SIDE } from './rasterise.js';

describe('svgSize', () => {
    it('reads width and height, in px or pt', () => {
        expect(svgSize({ width: '200', height: '100px' })).toEqual({ width: 200, height: 100 });
        expect(svgSize({ width: '75pt', height: '30pt' })).toEqual({ width: 100, height: 40 });
    });

    it('falls back to the viewBox when the width is a percentage, as in Mermaid output', () => {
        expect(svgSize({ width: '100%', viewBox: '-8 -8 400 300' })).toEqual({ width: 400, height: 300 });
    });

    it('keeps the viewBox proportions when only one side is given', () => {
        expect(svgSize({ width: '200', viewBox: '0 0 400 300' })).toEqual({ width: 200, height: 150 });
    });

    it('returns null when the SVG gives no size', () => {
        expect(svgSize({})).toBeNull();
    });
});

describe('fitWithin', () => {
    it('caps the long side', () => {
        expect(fitWithin(3136, 1000)).toEqual({ width: MAX_SIDE, height: 500 });
        expect(fitWithin(1000, 4000)).toEqual({ width: 392, height: MAX_SIDE });
    });

    it('draws small diagrams at most twice as large', () => {
        expect(fitWithin(300, 200)).toEqual({ width: 600, height: 400 });
        expect(fitWithin(300, 200, MAX_SIDE, 1)).toEqual({ width: 300, height: 200 });
    });
});
