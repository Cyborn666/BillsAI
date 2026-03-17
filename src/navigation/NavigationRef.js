import { createRef } from 'react';

export const NavigationRef = createRef();

export function navigate(name, params) {
    if (NavigationRef.current) {
      NavigationRef.current.navigate(name, params);
    }
  }