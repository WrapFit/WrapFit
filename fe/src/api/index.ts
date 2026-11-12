/**
 * WrapFit API: one module per backend module (`be/src/<module>`). Import functions by name, or use `apiClient`,
 * which groups every endpoint. Request / response types: `@/types/api` (re-exported here).
 */

import * as adminApi from "./admin";
import * as aiApi from "./ai";
import * as analyticsApi from "./analytics";
import * as authApi from "./auth";
import * as collectionsApi from "./collections";
import * as commonApi from "./common";
import * as exportsApi from "./exports";
import * as libraryApi from "./library";
import * as ordersApi from "./orders";
import * as paymentsApi from "./payments";
import * as printShopsApi from "./print-shops";
import * as projectsApi from "./projects";
import * as publicApi from "./public";
import * as storageApi from "./storage";
import * as templatesApi from "./templates";
import * as unboxingApi from "./unboxing";
import * as usersApi from "./users";

export * from "./admin";
export * from "./ai";
export * from "./analytics";
export * from "./auth";
export * from "./collections";
export * from "./common";
export * from "./exports";
export * from "./library";
export * from "./orders";
export * from "./payments";
export * from "./print-shops";
export * from "./projects";
export * from "./public";
export * from "./storage";
export * from "./templates";
export * from "./unboxing";
export * from "./users";

export const apiClient = {
  ...adminApi,
  ...aiApi,
  ...analyticsApi,
  ...authApi,
  ...collectionsApi,
  ...libraryApi,
  ...commonApi,
  ...exportsApi,
  ...ordersApi,
  ...paymentsApi,
  ...printShopsApi,
  ...projectsApi,
  ...publicApi,
  ...storageApi,
  ...templatesApi,
  ...unboxingApi,
  ...usersApi,
};

export { ApiError, errorMessage, isApiError } from "@/services/api";
export type * from "@/types/api";
