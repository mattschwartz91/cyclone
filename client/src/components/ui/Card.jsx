import React from 'react';

export default function Card({ children, className = '', ...props }) {
  return (
    <div className={`p-4 rounded-xl shadow-md bg-white ${className}`} {...props}>
      {children}
    </div>
  );
} 