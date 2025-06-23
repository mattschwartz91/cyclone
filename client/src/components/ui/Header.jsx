import React from 'react';

export default function Header({ children, level = 2, className = '', ...props }) {
  const Tag = `h${level}`;
  return (
    <Tag className={`text-base md:text-lg font-bold ${className}`} {...props}>
      {children}
    </Tag>
  );
} 