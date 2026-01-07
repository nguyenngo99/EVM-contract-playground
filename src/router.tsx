import {
  createRouter,
  createRoute,
  createRootRoute,
  Outlet,
} from '@tanstack/react-router';
import { publicClient } from './client';
import UsdcBalance from './components/UsdcBalance';
import ContractPlayground from './components/ContractPlayground';
import TabNavigation from './components/TabNavigation';

// Define the Root Route (Layout)
const rootRoute = createRootRoute({
  component: () => (
    <div className="app-container">
      <TabNavigation />
      <div className="tab-content">
        <Outlet />
      </div>
    </div>
  ),
});

// Define Child Routes
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <UsdcBalance publicClient={publicClient} />,
});

const playgroundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/playground',
  component: () => <ContractPlayground publicClient={publicClient} />,
});

const usdcRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/usdc',
  component: () => <UsdcBalance publicClient={publicClient} />,
});

// Create the Route Tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  playgroundRoute,
  usdcRoute,
]);

// Create the Router instance
export const router = createRouter({ routeTree });

// Register the router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
