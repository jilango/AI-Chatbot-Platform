/** Auth is cookie-based; no token is stored in JS. */

export const removeUser = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user');
  }
};

export const setUser = (user: unknown) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(user));
  }
};

export const getUser = (): unknown => {
  if (typeof window !== 'undefined') {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
  return null;
};

export const isAuthenticated = (): boolean => {
  return !!getUser();
};
