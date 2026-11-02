import { createRoutineEnvironmentAtoms } from "@isnadi/client-runtime/state/routines";

import { connectionAtomRuntime } from "../connection/runtime";

export const routineEnvironment = createRoutineEnvironmentAtoms(connectionAtomRuntime);
