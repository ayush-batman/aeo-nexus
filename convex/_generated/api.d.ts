/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as abuse from "../abuse.js";
import type * as actionMeasurements from "../actionMeasurements.js";
import type * as actions from "../actions.js";
import type * as activation from "../activation.js";
import type * as admin from "../admin.js";
import type * as alerts from "../alerts.js";
import type * as analysis from "../analysis.js";
import type * as analysisActions from "../analysisActions.js";
import type * as apiKeyActions from "../apiKeyActions.js";
import type * as apiKeys from "../apiKeys.js";
import type * as apiReads from "../apiReads.js";
import type * as apiWrites from "../apiWrites.js";
import type * as attribution from "../attribution.js";
import type * as attributionActions from "../attributionActions.js";
import type * as auditActions from "../auditActions.js";
import type * as auth from "../auth.js";
import type * as authActions from "../authActions.js";
import type * as authProviders from "../authProviders.js";
import type * as billing from "../billing.js";
import type * as billingActions from "../billingActions.js";
import type * as content from "../content.js";
import type * as contentActions from "../contentActions.js";
import type * as crawlerActions from "../crawlerActions.js";
import type * as crawlerData from "../crawlerData.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as discoveryActions from "../discoveryActions.js";
import type * as drift from "../drift.js";
import type * as experiments from "../experiments.js";
import type * as forum from "../forum.js";
import type * as forumActions from "../forumActions.js";
import type * as http from "../http.js";
import type * as importControl from "../importControl.js";
import type * as imports from "../imports.js";
import type * as indiaIndex from "../indiaIndex.js";
import type * as lib_actionRecords from "../lib/actionRecords.js";
import type * as lib_authLimit from "../lib/authLimit.js";
import type * as lib_importParity from "../lib/importParity.js";
import type * as lib_importRecords from "../lib/importRecords.js";
import type * as lib_limits from "../lib/limits.js";
import type * as lib_measurementContract from "../lib/measurementContract.js";
import type * as lib_publicIds from "../lib/publicIds.js";
import type * as lib_recommendationEvidence from "../lib/recommendationEvidence.js";
import type * as lib_rolePolicy from "../lib/rolePolicy.js";
import type * as lib_scanMetrics from "../lib/scanMetrics.js";
import type * as lib_snapshot from "../lib/snapshot.js";
import type * as lib_tenant from "../lib/tenant.js";
import type * as live from "../live.js";
import type * as mail from "../mail.js";
import type * as mailActions from "../mailActions.js";
import type * as measurementActions from "../measurementActions.js";
import type * as measurementAlerts from "../measurementAlerts.js";
import type * as measurementWorkflow from "../measurementWorkflow.js";
import type * as measurements from "../measurements.js";
import type * as metricBackfill from "../metricBackfill.js";
import type * as newsletter from "../newsletter.js";
import type * as newsletterActions from "../newsletterActions.js";
import type * as onboarding from "../onboarding.js";
import type * as organizations from "../organizations.js";
import type * as products from "../products.js";
import type * as prompts from "../prompts.js";
import type * as publicScanActions from "../publicScanActions.js";
import type * as publicScans from "../publicScans.js";
import type * as records from "../records.js";
import type * as scheduled from "../scheduled.js";
import type * as schedules from "../schedules.js";
import type * as settings from "../settings.js";
import type * as traffic from "../traffic.js";
import type * as trafficActions from "../trafficActions.js";
import type * as users from "../users.js";
import type * as validators from "../validators.js";
import type * as weekly from "../weekly.js";
import type * as weeklyActions from "../weeklyActions.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  abuse: typeof abuse;
  actionMeasurements: typeof actionMeasurements;
  actions: typeof actions;
  activation: typeof activation;
  admin: typeof admin;
  alerts: typeof alerts;
  analysis: typeof analysis;
  analysisActions: typeof analysisActions;
  apiKeyActions: typeof apiKeyActions;
  apiKeys: typeof apiKeys;
  apiReads: typeof apiReads;
  apiWrites: typeof apiWrites;
  attribution: typeof attribution;
  attributionActions: typeof attributionActions;
  auditActions: typeof auditActions;
  auth: typeof auth;
  authActions: typeof authActions;
  authProviders: typeof authProviders;
  billing: typeof billing;
  billingActions: typeof billingActions;
  content: typeof content;
  contentActions: typeof contentActions;
  crawlerActions: typeof crawlerActions;
  crawlerData: typeof crawlerData;
  crons: typeof crons;
  dashboard: typeof dashboard;
  discoveryActions: typeof discoveryActions;
  drift: typeof drift;
  experiments: typeof experiments;
  forum: typeof forum;
  forumActions: typeof forumActions;
  http: typeof http;
  importControl: typeof importControl;
  imports: typeof imports;
  indiaIndex: typeof indiaIndex;
  "lib/actionRecords": typeof lib_actionRecords;
  "lib/authLimit": typeof lib_authLimit;
  "lib/importParity": typeof lib_importParity;
  "lib/importRecords": typeof lib_importRecords;
  "lib/limits": typeof lib_limits;
  "lib/measurementContract": typeof lib_measurementContract;
  "lib/publicIds": typeof lib_publicIds;
  "lib/recommendationEvidence": typeof lib_recommendationEvidence;
  "lib/rolePolicy": typeof lib_rolePolicy;
  "lib/scanMetrics": typeof lib_scanMetrics;
  "lib/snapshot": typeof lib_snapshot;
  "lib/tenant": typeof lib_tenant;
  live: typeof live;
  mail: typeof mail;
  mailActions: typeof mailActions;
  measurementActions: typeof measurementActions;
  measurementAlerts: typeof measurementAlerts;
  measurementWorkflow: typeof measurementWorkflow;
  measurements: typeof measurements;
  metricBackfill: typeof metricBackfill;
  newsletter: typeof newsletter;
  newsletterActions: typeof newsletterActions;
  onboarding: typeof onboarding;
  organizations: typeof organizations;
  products: typeof products;
  prompts: typeof prompts;
  publicScanActions: typeof publicScanActions;
  publicScans: typeof publicScans;
  records: typeof records;
  scheduled: typeof scheduled;
  schedules: typeof schedules;
  settings: typeof settings;
  traffic: typeof traffic;
  trafficActions: typeof trafficActions;
  users: typeof users;
  validators: typeof validators;
  weekly: typeof weekly;
  weeklyActions: typeof weeklyActions;
  workspaces: typeof workspaces;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
  workflow: import("@convex-dev/workflow/_generated/component.js").ComponentApi<"workflow">;
  measurementWorkpool: import("@convex-dev/workpool/_generated/component.js").ComponentApi<"measurementWorkpool">;
};
