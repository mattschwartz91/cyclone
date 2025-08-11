import { useLocation, Link } from 'react-router-dom';
import { disablePageScroll, enablePageScroll } from 'scroll-lock';
import { cycloneLogo } from '../constants/index';
import { navigation } from '../constants';
import Button from './Button';
import MenuSvg from '../assets/svg/MenuSvg';
import { HamburgerMenu } from './design/Header';
import { useState } from 'react';
import { useAuthModal } from '../contexts/AuthModalContext';

const Header = () => {
  const location = useLocation();
  const [openNavigation, setOpenNavigation] = useState(false);
  const { openAuthModal } = useAuthModal();

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

  return (
    <div
      className={`fixed top-0 left-0 w-full z-50  border-b border-n-6 lg:bg-n-8/90 lg:backdrop-blur-sm ${
        openNavigation ? "bg-n-8" : "bg-n-8/90 backdrop-blur-sm"
      }`}
    >
      <div className="flex items-center px-2 lg:px-4 xl:px-6 max-lg:py-4">
        <Link to="/" className="flex items-center" onClick={() => {
          // Scroll to home section after navigation
          setTimeout(() => {
            const homeElement = document.getElementById('home');
            if (homeElement) {
              homeElement.scrollIntoView({ behavior: 'smooth' });
            }
          }, 100);
        }}>
          <img src={cycloneLogo} className="h-16 w-auto lg:h-20" alt="Cyclone" />
        </Link>

        <nav
          className={`${
            openNavigation ? "flex" : "hidden"
          } fixed top-[5rem] left-0 right-0 bottom-0 bg-n-8 lg:static lg:flex lg:mx-auto lg:bg-transparent`}
        >
          <div className="relative z-2 flex flex-col items-center justify-center m-auto lg:flex-row">
            {navigation.map((item) => (
              <a
                key={item.id}
                href={item.url}
                onClick={handleClick}
                className={`block relative font-code text-2xl uppercase text-n-1 transition-all duration-300 hover:text-color-1 hover:scale-105 ${
                  item.onlyMobile ? "lg:hidden" : ""
                } px-6 py-6 md:py-8 lg:-mr-0.25 lg:text-base lg:font-semibold ${
                  item.url === location.pathname || item.url === location.hash
                    ? "z-2 lg:text-n-1"
                    : "lg:text-n-1/50"
                } lg:leading-5 lg:hover:text-n-1 xl:px-12`}
              >
                {item.title}
              </a>
            ))}
          </div>

          <HamburgerMenu />
        </nav>

        <button
          onClick={() => openAuthModal('signup')}
          className="button hidden mr-8 text-n-1/50 transition-colors hover:text-n-1 lg:block font-code text-sm lg:text-base xl:text-lg "
        >
          New account
        </button>
        <Button className="hidden lg:flex lg:flec text-sm" onClick={() => openAuthModal('login')}>
          Sign in
        </Button>

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