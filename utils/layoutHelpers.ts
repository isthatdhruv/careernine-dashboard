// utils/layoutHelpers.ts
export const isAuthRoute = (pathname: string) => {
    return ['/login', '/register', '/forgot-password'].includes(pathname);
  };
  