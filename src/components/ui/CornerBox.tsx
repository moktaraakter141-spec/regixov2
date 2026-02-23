import React from "react";

type CornerBoxProps = {
  children: React.ReactNode;
  color?: string; // border + dot color, default orange
  className?: string;
  dotSize?: string; // dot size, default "h-1.5 w-1.5"
};

const CornerBox = ({
  children,
  color = "#E8602E",
  className = "",
  dotSize = "h-1 w-1",
}: CornerBoxProps) => {
  const bg = `${color}21`; // 13% opacity background

  return (
    <span
      className={`relative inline-block px-2 pt-[.06rem] ${className}`}
      style={{ border: `1px solid ${color}`, background: bg }}
    >
      {children}

      {/* চার কোণের dot */}
      <span
        className={`absolute top-0 left-0 ${dotSize} -translate-x-1/2 -translate-y-1/2 z-10`}
        style={{ background: color }}
      />
      <span
        className={`absolute top-0 right-0 ${dotSize} translate-x-1/2 -translate-y-1/2 z-10`}
        style={{ background: color }}
      />
      <span
        className={`absolute bottom-0 left-0 ${dotSize} -translate-x-1/2 translate-y-1/2 z-10`}
        style={{ background: color }}
      />
      <span
        className={`absolute bottom-0 right-0 ${dotSize} translate-x-1/2 translate-y-1/2 z-10`}
        style={{ background: color }}
      />
    </span>
  );
};

export default CornerBox;

// ব্যবহার:
//
// default orange:
// <CornerBox>Companies</CornerBox>
//
// custom color:
// <CornerBox color="#2E60E8">Projects</CornerBox>
//
// extra class:
// <CornerBox className="text-white font-bold text-xl">Featured</CornerBox>
//
// custom dot size:
// <CornerBox dotSize="h-2 w-2">Big Dots</CornerBox>
