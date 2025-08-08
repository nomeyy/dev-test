import { appMiddlewares, apiMiddlewares, sseMiddlewares } from "./config";
import { compose } from "./utils";

export type { Middleware } from "./types";

export const appPipeline = compose(appMiddlewares);
export const apiPipeline = compose(apiMiddlewares);
export { sseMiddlewares };
