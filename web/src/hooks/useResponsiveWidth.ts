import useWindowSize from "react-use/lib/useWindowSize";

enum TailwindResponsiveWidth {
  sm = 640, // Mobile
  md = 768, // Tablet
  lg = 1024, // Laptop
}

const useResponsiveWidth = () => {
  const { width } = useWindowSize();
  return {
    sm: width >= TailwindResponsiveWidth.sm,
    md: width >= TailwindResponsiveWidth.md,
    lg: width >= TailwindResponsiveWidth.lg,
  };
};

export default useResponsiveWidth;
