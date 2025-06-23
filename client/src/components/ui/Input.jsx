import React from 'react';

export default function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-1/2 p-1 rounded border ${className}`}
      {...props}
    />
  );
} 