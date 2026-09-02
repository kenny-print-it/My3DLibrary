export function getPortableLibraryColumnCount(viewportWidth: number): number {
  if (viewportWidth >= 3840) return 12;
  if (viewportWidth >= 2560) return 10;
  if (viewportWidth >= 1920) return 8;
  if (viewportWidth >= 1600) return 7;
  if (viewportWidth >= 1280) return 6;
  if (viewportWidth >= 1024) return 5;
  if (viewportWidth >= 768) return 4;
  if (viewportWidth >= 640) return 3;
  return 2;
}

export const PORTABLE_LIBRARY_TOOLBAR_CLASS = "sticky top-14 z-30 -mx-4 border-y border-border/50 bg-background/95 px-4 py-3 backdrop-blur-md sm:mx-0 sm:rounded-xl sm:border";
