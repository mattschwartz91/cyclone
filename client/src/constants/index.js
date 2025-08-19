// Asset imports
import cycloneSymbolRight from '../assets/cyclone-symbol-right.svg';
import cycloneSymbolLeft from '../assets/cyclone-symbol-left.svg';
import cycloneLogo from '../assets/cyclone-logo.svg';
import CYCLONE from '../assets/home/CYCLONE.png';
import curve from '../assets/home/curve.png';
import homeBackground from '../assets/home/home-background.jpg';
import background from '../assets/home/background.jpg';

// Export all assets
export {
  cycloneSymbolRight,
  cycloneSymbolLeft,
  cycloneLogo,
  CYCLONE,
  curve,
  homeBackground,
  background,
};

export const navigation = [
  {
    id: "0",
    title: "Home",
    url: "#home",
  },
  {
    id: "1",
    title: "About",
    url: "#about",
  },
  {
    id: "2",
    title: "Generate Routes",
    url: "#generate-routes",
  },
  /*{
    id: "3",
    title: "View saved routes",
    url: "#saved-routes",
  },*/
  {
    id: "4",
    title: "New account",
    url: "#signup",
    onlyMobile: true,
  },
  {
    id: "5",
    title: "Sign in",
    url: "#login",
    onlyMobile: true,
  },
];
