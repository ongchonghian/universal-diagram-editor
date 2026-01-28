// React helpers for ES modules
// Uses htm for JSX-like syntax without build step

import htm from 'https://esm.sh/htm@3.1.1';

// Get React from import map (ESM)
import React from 'react';
const { 
    useState, 
    useEffect, 
    useRef, 
    useCallback, 
    useMemo,
    memo,
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
    memo,
    forwardRef, 
    useImperativeHandle, 
    useLayoutEffect,
    createContext,
    useContext
};
