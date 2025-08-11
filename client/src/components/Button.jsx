import { useState } from 'react';
import ButtonSvg from '../assets/svg/ButtonSvg';
import ButtonGlow from '../assets/svg/ButtonGlow';
 // This is a placeholder for the Button component, which can be replaced with the actual implementation
  // The Button component should handle click events and display a button with a specific style
  // It can also accept props for customization, such as text, onClick handler, and additional styles
  // The Button component can be used in various parts of the application, such as in forms
  // or as a standalone button for actions like submitting data or navigating to different pages
const Button = ({ className, href, children, onClick, px, white, outline, disabled }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const baseClasses = `button relative inline-flex items-center justify-center h-11 transition-all duration-300 hover:text-color-1 hover:scale-105 ${px || 'px-7'}`;
  const colorClasses = white ? 'text-n-8' : 'text-n-1';

  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '';
  
  const classes = `${baseClasses} ${colorClasses} ${disabledClasses} ${className || ''}`;
  const spanClasses = 'relative z-10';

  const renderButton = () => (
    <button 
      className={classes} 
      onClick={onClick} 
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className={spanClasses}>{children}</span>
      {/* Removed ButtonGlow to eliminate purple glow effects */}
      {ButtonSvg(white, !white)}
    </button>
  );

  const renderLink = () => (
    <a 
      href={href} 
      className={classes}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className={spanClasses}>{children}</span>
      {/* Removed ButtonGlow to eliminate purple glow effects */}
      {ButtonSvg(white, !white)}
    </a>
  );
  // If href is provided, render as a link; otherwise, render as a button
  return href ? renderLink() : renderButton();
}
export default Button;


// export default function Button({ children, onClick, type = 'button', className, href, px, white }) {
//   const classes = `button relative inline-flex items-center justify-center h-11 transition-colors hover:text-color-1 ${px || 'px-7'} ${white ? 'text-n-8': 'text-n-1'} $className || ''}`;
// }

//   const spanClasses = 'relative z-10';

//   const renderButton = () => (
//     <button className={classes}>
//       <span className={spanClasses}>{children}</span>
//       {ButtonSvg(white)}
//     </button>
//   );

//   const renderLink = () => (
//     // Clickable link (href)
//     <a href={href} className={classes}>
//     <span className={spanClasses}>{children}</span>
//       {ButtonSvg(white)}
//     </a>
//   )

//   // If href is provided, render as a link; otherwise, render as a button
//   return href
//   ? renderLink()
//   :renderButton();
// };
