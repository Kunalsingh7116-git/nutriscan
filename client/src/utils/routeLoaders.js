// Share lazy imports with intent-based preloading. Failed requests remain retryable.
function preloadable(load) {
  let pending;
  return () => {
    if (!pending) pending = load().catch(error => { pending = undefined; throw error; });
    return pending;
  };
}

export const routeLoaders = {
  dashboard: preloadable(() => import('../pages/Dashboard')),
  photo: preloadable(() => import('../pages/PhotoLog')),
  library: preloadable(() => import('../pages/FoodProducts')),
  alerts: preloadable(() => import('../pages/Alerts')),
  profile: preloadable(() => import('../pages/Profile')),
  manual: preloadable(() => import('../pages/LogFood')),
  register: preloadable(() => import('../pages/Register')),
};

const routeKeys = { '/dashboard': 'dashboard', '/log-food': 'photo', '/food-products': 'library', '/alerts': 'alerts', '/profile': 'profile', '/log-food/manual': 'manual', '/register': 'register' };
export function preloadRoute(path) {
  // A failed prefetch must never block the link's normal navigation.
  routeLoaders[routeKeys[path]]?.().catch(() => {});
}
