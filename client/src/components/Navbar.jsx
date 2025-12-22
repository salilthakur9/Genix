import React from "react";
import { assets } from "../assets/assets";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useClerk, UserButton, useUser } from "@clerk/clerk-react";
import {motion} from 'framer-motion';

const Navbar = () => {
  const navigate = useNavigate();

  const { user } = useUser();
  const { openSignIn } = useClerk();
  return (
    <motion.div className="fixed z-5 w-full backdrop-blur-2xl flex justify-between items-center py-2 px-4 sm:px-20 xl:px-32"
    initial={{ opacity: 0.2, y: 100 }}
      transition={{ duration: 1 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <img
        src={assets.logo}
        alt="logo"
        onClick={() => navigate("/")}
        className="w-22 sm:w-34 cursor-pointer"
      />

      {user ? (
        <UserButton />
      ) : (
        <button onClick={openSignIn} className="flex items-center gap-2 rounded-full text-sm cursor-pointer bg-gradient-to-r from-blue-300 to-white w-45 h-9 text-black px-10 py-2.5">
          Get Started <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
};

export default Navbar;
