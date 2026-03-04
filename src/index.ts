import { YangonKit } from "./Classes";

export * from "./Constants";
export * from "./Classes";
export type * from "./types";

export function yangonKit() {
    return new YangonKit({});
}