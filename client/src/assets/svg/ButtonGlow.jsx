const ButtonGlow = ({ isVisible }) => {
  const filterId = `purple-glow-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className={`absolute inset-0 transition-opacity duration-300 pointer-events-none ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Left curved section glow */}
      <svg
        className="absolute top-0 left-0"
        width="21"
        height="44"
        viewBox="0 0 21 44"
      >
        <defs>
          <filter id={`${filterId}-left`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <path
          fill="rgba(172, 108, 255, 0.2)"
          stroke="rgba(172, 108, 255, 0.8)"
          strokeWidth="2"
          filter={`url(#${filterId}-left)`}
          d="M21,43.00005 L8.11111,43.00005 C4.18375,43.00005 1,39.58105 1,35.36365 L1,8.63637 C1,4.41892 4.18375,1 8.11111,1 L21,1"
        />
      </svg>
      
      {/* Middle section glow */}
      <svg
        className="absolute top-0 left-[1.25rem] w-[calc(100%-2.5rem)]"
        height="44"
        viewBox="0 0 100 44"
        preserveAspectRatio="none"
      >
        <defs>
          <filter id={`${filterId}-middle`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <rect
          x="0"
          y="2"
          width="100"
          height="40"
          fill="rgba(172, 108, 255, 0.2)"
          stroke="rgba(172, 108, 255, 0.8)"
          strokeWidth="2"
          filter={`url(#${filterId}-middle)`}
        />
      </svg>
      
      {/* Right curved section glow */}
      <svg
        className="absolute top-0 right-0"
        width="21"
        height="44"
        viewBox="0 0 21 44"
      >
        <defs>
          <filter id={`${filterId}-right`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <path
          fill="rgba(172, 108, 255, 0.2)"
          stroke="rgba(172, 108, 255, 0.8)"
          strokeWidth="2"
          filter={`url(#${filterId}-right)`}
          d="M0,43.00005 L5.028,43.00005 L12.24,43.00005 C16.526,43.00005 20,39.58105 20,35.36365 L20,16.85855 C20,14.59295 18.978,12.44425 17.209,10.99335 L7.187,2.77111 C5.792,1.62675 4.034,1 2.217,1 L0,1"
        />
      </svg>
    </div>
  );
};

export default ButtonGlow;
