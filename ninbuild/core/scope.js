import {
	DRAFT_STATE,
	ProxyTypeProxyObject,
	ProxyTypeProxyArray,
	getPlugin,
	__DEV__
} from "../internal.js"
import {die} from "../utils/errors.js"
let currentScope
export function getCurrentScope() {
	if (__DEV__ && !currentScope) die(0)
	return currentScope
}
function createScope(parent_, immer_) {
	return {
		drafts_: [],
		parent_,
		immer_,
		// Whenever the modified draft contains a draft from another scope, we
		// need to prevent auto-freezing so the unowned draft can be finalized.
		canAutoFreeze_: true,
		unfinalizedDrafts_: 0
	}
}
export function usePatchesInScope(scope, patchListener) {
	if (patchListener) {
		getPlugin("Patches") // assert we have the plugin
		scope.patches_ = []
		scope.inversePatches_ = []
		scope.patchListener_ = patchListener
	}
}
export function revokeScope(scope) {
	leaveScope(scope)
	scope.drafts_.forEach(revokeDraft)
	// @ts-ignore
	scope.drafts_ = null
}
export function leaveScope(scope) {
	if (scope === currentScope) {
		currentScope = scope.parent_
	}
}
export function enterScope(immer) {
	return (currentScope = createScope(currentScope, immer))
}
function revokeDraft(draft) {
	const state = draft[DRAFT_STATE]
	if (
		state.type_ === ProxyTypeProxyObject ||
		state.type_ === ProxyTypeProxyArray
	)
		state.revoke_()
	else state.revoked_ = true
}
