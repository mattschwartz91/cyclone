import background from "../../assets/background.jpg";

export const Rings = () => {
  return (
    <div className="absolute top-1/2 left-1/2 w-[38.5rem] aspect-square border border-n-2/10 rounded-full -translate-x-1/2 -translate-y-1/2">
      <div className="absolute top-1/2 left-1/2 w-[28.5rem] aspect-square border border-n-2/10 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute top-1/2 left-1/2 w-[18.5rem] aspect-square border border-n-2/10 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
    </div>
  );
};

export const SideLines = () => {
  return null;
};

export const BackgroundCircles = () => {
  return (
    <>
      <div className="absolute top-[11.4rem] left-16 w-4 h-4 bg-gradient-to-b from-[#DD734F] to-[#1A1A32] rounded-full"></div>
      <div className="absolute top-[24.6rem] right-16 w-4 h-4 bg-gradient-to-b from-[#B9AEDF] to-[#1A1A32] rounded-full"></div>
      <div className="absolute top-[42.8rem] left-12 w-8 h-8 bg-gradient-to-b from-[#88E5BE] to-[#1A1A32] rounded-full"></div>
    </>
  );
};

export const HamburgerMenu = () => {
  return (
    <div className="fixed inset-0 z-30 pointer-events-none lg:hidden">
      <div className="absolute inset-0 bg-n-8/1">
        <div className="absolute inset-0 opacity-[.09]">
          <img
            className="w-full h-full object-cover"
            src={background}
            width={688}
            height={953}
            alt="Background"
          />
        </div>

        <Rings />

        <SideLines />

        <BackgroundCircles />
      </div>
    </div>
  );
};
