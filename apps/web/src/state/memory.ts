import { createMemoryEnvironmentAtoms } from "@isnadi/client-runtime/state/memory";

import { connectionAtomRuntime } from "../connection/runtime";

export const memoryEnvironment = createMemoryEnvironmentAtoms(connectionAtomRuntime);
