import { useRef, useEffect } from "react";
import { motion, useAnimation, useInView } from "framer-motion";

const Heading = ({ title }) => {
  const words = title.split(" ").filter(w => w.trim() !== "");
  const controls = useAnimation();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-20% 0px" });

  useEffect(() => {
    if (inView) {
      controls.start("show");
    }
  }, [inView, controls]);

  const container = {
    hidden: { opacity: 1 },
    show: {
      opacity: 1,
        transition: {
        staggerChildren: 0.10,
      },
    },
  };

  const word = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { duration: 0.4, ease: "easeOut" },
    },
  };

  return (
    <div ref={ref} className="mb-6 text-left">
      <div className="body-3 text-2xl md:text-3xl lg:text-5xl">
        <motion.div
          variants={container}
          initial="hidden"
          animate={controls}
          className="inline"
        >
          {words.map((w, i) => (
            <motion.span key={i} variants={word}>
              {w}
            </motion.span>
          )).reduce((prev, curr) => [prev, ' ', curr])}
        </motion.div>
      </div>
    </div>
  );
};
export default Heading;