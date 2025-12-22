import React from "react";
import { useNavigate } from "react-router-dom";
import { assets } from "../assets/assets";
import {motion} from "framer-motion"

const Hero = () => {
  const navigate = useNavigate();
  return (
    <div className="px-4 sm:px-20 xl:px-32 relative inline-flex flex-col w-full justify-center bg-gradient-to-br from-blue-200 via-white to-white min-h-screen">
      <div className="text-center mb-6">
        <motion.h1 className="text-3xl sm:text-5xl md:text-6xl 2xl:text-7xl font-semibold mx-auto leading-[1.2]"
        initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4, duration: 1.5 }}
        >
          Create amazing content <br /> with{" "}
          <span className="text-blue-300">AI tools</span>
        </motion.h1>
        <motion.p className="mt-4 max-w-xs sm:max-w-lg 2xl:max-w-xl m-auto"
        initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4, duration: 1.5 }}>
          "Say goodbye to creative blocks. Genix lets you create high-quality content in seconds using powerful AI."
        </motion.p>
      </div>

      <motion.div className="flex flex-wrap justify-center gap-4 text-sm max-sm:text-xs"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4, duration: 1.5 }}
      >
        <button
          onClick={() => navigate("/ai")}
          className="bg-blue-300 text-black px-10 py-3 rounded-full hover:scale-102 active:scale-95 transition cursor-pointer"
        >
          Start Creating Now
        </button>
        <button className="bg-white px-10 py-3 rounded-full border border-blue-300 hover:scale-102 active:scale-95 transition cursor-pointer">
          Watch Demo
        </button>
      </motion.div>

      <motion.div className="flex items-center gap-4 mt-8 mx-auto text-gray-600"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4, duration: 1.5 }}
      >
        <img src={assets.user_group} className="h-8" /> Trusted by 10k+ poeple
      </motion.div>
    </div>
  );
};

export default Hero;
