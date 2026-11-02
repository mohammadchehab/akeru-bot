/**
 * CursorAdapter: shape type for the Cursor provider adapter, bundled per instance by
 * {@link ../Drivers/CursorDriver} like the OpenCode adapter.
 *
 * @module CursorAdapter
 */
import type { ProviderAdapterError } from "../Errors.ts";
import type { ProviderAdapterShape } from "./ProviderAdapter.ts";

export interface CursorAdapterShape extends ProviderAdapterShape<ProviderAdapterError> {}
