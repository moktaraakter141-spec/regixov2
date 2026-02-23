"use client";

const SmartText = ({
  text,
  className = "",
  banglaFont = "font-bangla",
  englishFont = "font-sans",
}: {
  text: string;
  className?: string;
  banglaFont?: string;
  englishFont?: string;
}) => {
  const isBangla = /[\u0980-\u09FF]/.test(text);
  return (
    <span className={`${isBangla ? banglaFont : englishFont} ${className}`}>
      {text}
    </span>
  );
};

export default SmartText;
