import { curve, CYCLONE, homeBackground as homeBackground } from "../assets/home";
import Button from "./Button";
import Section from "./Section";
import { BackgroundCircles, BottomLine, Gradient } from "./design/Home";
import { ScrollParallax } from "react-just-parallax";
import { motion } from "framer-motion";
import { useRef } from "react";
import AuthModal from "./AuthModal";
import { useAuthModal } from "../contexts/AuthModalContext";

// TODO: make webmaster betyter visable + an email link
// TODO: add custom greeting if signed in

const Home = () => {
  const parallaxRef = useRef(null);
  const { authModal, openAuthModal, closeAuthModal, switchAuthType } = useAuthModal();
  return (
    <Section
      className="pt-[12rem] -mt-[5.25rem]"
      crosses
      crossesOffset="lg:translate-y-[5.25rem]"
      customPadding="py-10 lg:py-16 xl:py-20"
      id="home"
    >
      <div className="fixed inset-0 w-screen h-screen z-0" ref={parallaxRef}>
        <div className="relative w-full h-full">
          <img 
            src={homeBackground}
            className="w-full h-full object-cover opacity-80" 
            width={1440} 
            height={1800} 
            alt="home-background" 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-n-8/2 via-n-8/5 to-n-8/10 backdrop-blur-[1px]"></div>
        </div>
        <ScrollParallax>
          <BackgroundCircles />
        </ScrollParallax>
      </div>
      
      <div className="container relative z-10">
        <div className="relative max-w-[60rem] mx-auto text-center mb-[3.875rem] md:mb-10 lg:mb-[6.25rem]lg:mt-8 xl:mt-12">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="h1 mb-6"
          >
            Stress-free biking routes, <span className="text-color-1 italic mr-1">personalized</span> for you by{" "}
            <span className="inline-block relative">
              <img 
                src={CYCLONE}
                className="inline-block align-text-bottom h-[1.1em] w-auto"
                alt="Cyclone"
              />
              <img
                src={curve}
                className="absolute top-full left-0 w-full h-auto max-h-[0.25em] translate-y-1"
                alt=""
              />
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="body-1 max-w-2xl mx-auto mb-6 text-n-2 lg:mb-8 mt-10"
          >
            Tell Cyclone your mileage, elevation, & ride style.
            We'll craft the perfect path so you can focus on the ride, not on the map.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Button onClick={() => openAuthModal('signup')} white>
              Get started
            </Button>
          </motion.div>
        </div>
      </div>

      <AuthModal
        isOpen={authModal.isOpen}
        onClose={closeAuthModal}
        type={authModal.type}
        onSwitchType={switchAuthType}
      />
    </Section>
  );
};

export default Home;