// Should be no imports here!
// Some things that should be evaluated before all else...
// We only want to know if non-polyfilled symbols are available
const hasSymbol =
	typeof Symbol !== "undefined" && typeof Symbol("x") === "symbol"
export const hasMap = typeof Map !== "undefined"
export const hasSet = typeof Set !== "undefined"
export const hasProxies =
	typeof Proxy !== "undefined" &&
	typeof Proxy.revocable !== "undefined" &&
	typeof Reflect !== "undefined"
/* istanbul ignore next */
function mini() {}
export const isMinified = mini.name !== "mini"
/**
 * The sentinel value returned by producers to replace the draft with undefined.
 */
export const NOTHING = hasSymbol
	? Symbol("immer-nothing")
	: {["immer-nothing"]: true}
/**
 * To let Immer treat your class instances as plain immutable objects
 * (albeit with a custom prototype), you must define either an instance property
 * or a static property on each of your custom classes.
 *
 * Otherwise, your class instance will never be drafted, which means it won't be
 * safe to mutate in a produce callback.
 */
export const DRAFTABLE = hasSymbol
	? Symbol("immer-draftable")
	: "__$immer_draftable"
export const DRAFT_STATE = hasSymbol ? Symbol("immer-state") : "__$immer_state"
// Even a polyfilled Symbol might provide Symbol.iterator
export const iteratorSymbol =
	(typeof Symbol != "undefined" && Symbol.iterator) || "@@iterator"
/** Use a class type for `nothing` so its type is unique */
export class Nothing {}
