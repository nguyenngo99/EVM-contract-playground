import {
  createRouter,
  createRoute,
  createRootRoute,
} from '@tanstack/react-router';
import { publicClient } from './client';
import UsdcBalance from './components/UsdcBalance';
import ContractPlayground from './components/ContractPlayground';
import Layout from './components/Layout';

// Define the Root Route (Layout)
const rootRoute = createRootRoute({
  component: Layout,
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
