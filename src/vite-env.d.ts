/// <reference types="vite/client" />

import * as React from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'math-field': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        onInput?: (e: Event) => void;
        value?: string;
        'math-virtual-keyboard-policy'?: 'auto' | 'manual' | 'sandboxed';
      };
    }
  }
}

export {};
