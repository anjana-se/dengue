/**
 * App configuration seams.
 *
 * The design exposes `defaultLoginMethod` as an editable prop (mobile | email |
 * google, default "mobile"). Here it is a single constant — wire it to a build
 * flag / remote config when the sign-in options are provisioned per deployment.
 */
export type LoginMethod = "mobile" | "email" | "google";

export const DEFAULT_LOGIN_METHOD: LoginMethod = "mobile";
