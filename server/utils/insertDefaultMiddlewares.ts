import { Common } from '@strapi/types/dist/types/core';
import pluginId from '../../utils/pluginId';

const middlewares = [`plugin::${pluginId}.keepMainIdentity`];

export default function insertDefaultMiddlewares() {
  const routes = getApiRoutes();

  for (const route of routes) {
    if (!route.config) route.config = {};
    const { config } = route;

    if (!config.middlewares) config.middlewares = [];
    // push ...middlewares to the front of the array
    config.middlewares.unshift(...middlewares);
  }
}

function getApiRoutes(): Common.Route[] {
  const routers = Object.values(strapi.api).flatMap((api) => Object.values(api.routes));

  return routers.flatMap((router) => router.routes);
}
