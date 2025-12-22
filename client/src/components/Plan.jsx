import React from "react";
import {PricingTable} from '@clerk/clerk-react'
import {motion} from 'framer-motion';

const Plan = () => {
  return (
    <motion.div className="bg-gradient-to-t from-white via-blue-50 to-white"
    initial={{ opacity: 0.2, y: 100 }}
      transition={{ duration: 1 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
    <div className="max-w-2xl mx-auto z-20 my-30">
      <div className="text-center">
        <h2 className="text-slate-700 text-[42px] font-semibold">
          Choose Your Plan
        </h2>
        <p className="text-gray-500 max-w-lg mx-auto">
          Upgrade to Premium and experience faster generation, enhanced features, and more content credits.
        </p>
      </div>

      <div className="mt-14 max-sm:mx-8">
        <PricingTable />
      </div>
    </div>
    </motion.div>
  );
};

export default Plan;
