// React helpers for ES modules
// Uses htm for JSX-like syntax without build step

import htm from 'https://esm.sh/htm@3.1.1';

// Get React from global (loaded via CDN)
const React = window.React;
const { 
    useState, 
    useEffect, 
    useRef, 
    useCallback, 
    useMemo,
    forwardRef, 
    useImperativeHandle, 
    useLayoutEffect,
    createContext,
    useContext
} = React;

// Bind htm to React.createElement for JSX-like syntax
// Usage: html`<div className="foo">${content}</div>`
const html = htm.bind(React.createElement);

export { 
    React, 
    html, 
    useState, 
    useEffect, 
    useRef, 
    useCallback,
    useMemo,
    forwardRef, 
    useImperativeHandle, 
    useLayoutEffect,
    createContext,
    useContext
};
