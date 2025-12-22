import React from "react";

const ArticleSkeleton = () => {
  return (
    <>
      <div className="space-y-3 animate-pulse">
        {/* Title */}
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>

        {/* Paragraph lines */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="h-3 bg-gray-200 rounded w-full"
          />
        ))}

        {/* Smaller paragraph */}
        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
      </div>
    </>
  );
};

export default ArticleSkeleton;
