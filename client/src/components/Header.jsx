import { useLocation, useNavigate } from 'react-router-dom';
import { disablePageScroll, enablePageScroll } from 'scroll-lock';
import { cycloneLogo } from '../constants/index';
import { navigation } from '../constants';
import Button from './Button';
import MenuSvg from '../assets/svg/MenuSvg';
import { HamburgerMenu } from './design/Header';
import { useState, useEffect } from 'react';
import { useAuthModal } from '../contexts/AuthModalContext';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [openNavigation, setOpenNavigation] = useState(false);
  const [currentHash, setCurrentHash] = useState(location.hash);
  const { openAuthModal } = useAuthModal();

  // Update currentHash when location changes
  useEffect(() => {
    setCurrentHash(location.hash);
  }, [location.hash]);

  // Handle cases where we might need to clear the hash (when clicking logo)
  const handleLogoClick = () => {
    setCurrentHash('');
    navigate('/');
  };

  const toggleNavigation = () => {
    if (openNavigation) {
      setOpenNavigation(false);
      enablePageScroll();
    } else {
      setOpenNavigation(true);
      disablePageScroll();
    }
  };

  const handleClick = () => {
    if (!openNavigation) return;
    // Close the navigation when a link is clicked (This prevents the navigation from staying open after clicking a link)

    enablePageScroll();
    setOpenNavigation(false);
  };

  const handleNavClick = (e, item) => {
    e.preventDefault();
    handleClick();

    // Auth-related nav items (mobile) trigger the Coming Soon modal
    if (item.url === '#signup' || item.url === '#login') {
      openAuthModal(item.url === '#signup' ? 'signup' : 'login');
      return;
    }
    
    // Updates currentHash for instant visual feedback
    setCurrentHash(item.url);
    
    // If the user is not on the home page, navigate to home first with the hash
    if (location.pathname !== '/') {
      navigate(`/${item.url}`, { 
        state: { scrollToHash: item.url },
        replace: false 
      });
    } else {
      // If the user is already on the home page, then update URL hash and scroll to the section
      window.history.replaceState(null, '', item.url);
      const element = document.querySelector(item.url);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div
      className={`fixed top-0 left-0 w-full z-50  border-b border-n-6 lg:bg-n-8/90 lg:backdrop-blur-sm ${openNavigation ? "bg-n-8" : "bg-n-8/90 backdrop-blur-sm"
        }`}
    >
      <div className="flex items-center px-2 lg:px-4 xl:px-6 max-lg:py-4">
        <button onClick={handleLogoClick} className="flex items-center">
          <img src={cycloneLogo} className="h-16 w-auto lg:h-20" alt="Cyclone" />
        </button>

        <nav
          className={`${openNavigation ? "flex" : "hidden"
            } fixed top-[5rem] left-0 right-0 bottom-0 bg-n-8 lg:static lg:flex lg:mx-auto lg:bg-transparent`}
        >
          <div className="relative z-2 flex flex-col items-center justify-center m-auto lg:flex-row">
            {navigation.map((item) => (
              <a
                key={item.id}
                href={item.url}
                onClick={(e) => handleNavClick(e, item)}
                className={`block relative font-code text-2xl uppercase text-n-1 transition-all duration-300 ${item.onlyMobile ? "lg:hidden" : ""
                  } px-6 py-6 md:py-8 lg:-mr-0.25 lg:text-base lg:font-semibold lg:leading-5 xl:px-12 ${
                    item.url === currentHash
                      ? "z-2 lg:text-n-1 hover:text-color-1"
                      : "lg:text-n-1/50 hover:text-color-1 lg:hover:text-n-1"
                  } hover:scale-105`}
              >
                {item.title}
              </a>
            ))}
          </div>

          <HamburgerMenu />
        </nav>

        

        <div className="hidden lg:flex items-center ml-auto">
          <button
            onClick={() => openAuthModal('signup')}
            className="button mr-8 text-n-1/50 transition-colors hover:text-n-1 font-code text-sm lg:text-base xl:text-lg"
          >
            New account
          </button>
          <Button className="text-sm" onClick={() => openAuthModal('login')}>
            Sign in
          </Button>
        </div>
        

        <Button
          className="ml-auto lg:hidden"
          px="px-3"
          onClick={toggleNavigation}
        >
          <MenuSvg openNavigation={openNavigation} />
        </Button>
      </div>
    </div>
  );
};

export default Header;