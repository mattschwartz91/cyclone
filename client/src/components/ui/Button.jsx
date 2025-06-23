import React from 'react';

export default function Button({ children, onClick, type = 'button', className = '', ...props }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`block w-full text-center px-4 py-2 mt-2 rounded shadow hover:bg-[#3bc6df] transition ${className}`}
      {...props}
    >
      {children}
    </button>
  );
} 