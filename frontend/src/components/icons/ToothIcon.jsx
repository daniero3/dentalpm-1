import React from 'react';

export const ToothIcon = ({ className = "h-6 w-6", color = "currentColor" }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path 
      d="M12 2C9.5 2 7.5 3.5 7 5.5C6.5 7.5 6 9 5.5 11C5 13 4.5 15 5 17C5.5 19 6.5 21 8 22C8.5 22 9 21.5 9.5 20C10 18.5 10.5 16 11 14C11.5 12 12 12 12 12C12 12 12.5 12 13 14C13.5 16 14 18.5 14.5 20C15 21.5 15.5 22 16 22C17.5 21 18.5 19 19 17C19.5 15 19 13 18.5 11C18 9 17.5 7.5 17 5.5C16.5 3.5 14.5 2 12 2Z" 
      fill={color}
      stroke={color}
      strokeWidth="0.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path 
      d="M9 6C9 6 10 7 12 7C14 7 15 6 15 6" 
      stroke={color === "currentColor" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.4)"}
      strokeWidth="1"
      strokeLinecap="round"
    />
  </svg>
);

export default ToothIcon;
