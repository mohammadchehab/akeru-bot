import { createComputerEnvironmentAtoms } from "@isnadi/client-runtime/state/computer";

import { connectionAtomRuntime } from "../connection/runtime";

export const computerEnvironment = createComputerEnvironmentAtoms(connectionAtomRuntime);
