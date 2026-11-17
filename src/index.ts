import { YangonKit, YangonKitOptions } from "./Classes";

export * from "./Constants";
export * from "./Classes";
export type * from "./types";

export function yangonKit(options?: YangonKitOptions) {
    return new YangonKit(options ?? {});
}