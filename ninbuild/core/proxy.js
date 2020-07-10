import {
	each,
	has,
	is,
	isDraftable,
	shallowCopy,
	latest,
	getCurrentScope,
	DRAFT_STATE,
	die,
	createProxy,
	ProxyTypeProxyObject,
	ProxyTypeProxyArray,
	__DEV__
} from "../internal.js"
/**
 * Returns a new draft of the `base` object.
 *
 * The second argument is the parent draft-state (used internally).
 */
export function createProxyProxy(base, parent) {
	const isArray = Array.isArray(base)
	const state = {
		type_: isArray ? ProxyTypeProxyArray : ProxyTypeProxyObject,
		// Track which produce call this is associated with.
		scope_: parent ? parent.scope_ : getCurrentScope(),
		// True for both shallow and deep changes.
		modified_: false,
		// Used during finalization.
		finalized_: false,
		// Track which properties have been assigned (true) or deleted (false).
		assigned_: {},
		// The parent draft state.
		parent_: parent,
		// The base state.
		base_: base,
		// The base proxy.
		draft_: null,
		// The base copy with any updated values.
		copy_: null,
		// Called by the `produce` function.
		revoke_: null,
		isManual_: false
	}
	// the traps must target something, a bit like the 'real' base.
	// but also, we need to be able to determine from the target what the relevant state is
	// (to avoid creating traps per instance to capture the state in closure,
	// and to avoid creating weird hidden properties as well)
	// So the trick is to use 'state' as the actual 'target'! (and make sure we intercept everything)
	// Note that in the case of an array, we put the state in an array to have better Reflect defaults ootb
	let target = state
	let traps = objectTraps
	if (isArray) {
		target = [state]
		traps = arrayTraps
	}
	const {revoke, proxy} = Proxy.revocable(target, traps)
	state.draft_ = proxy
	state.revoke_ = revoke
	return proxy
}
/**
 * Object drafts
 */
export const objectTraps = {
	get(state, prop) {
		if (prop === DRAFT_STATE) return state
		const source = latest(state)
		if (!has(source, prop)) {
			// non-existing or non-own property...
			return readPropFromProto(state, source, prop)
		}
		const value = source[prop]
		if (state.finalized_ || !isDraftable(value)) {
			return value
		}
		// Check for existing draft in modified state.
		// Assigned values are never drafted. This catches any drafts we created, too.
		if (value === peek(state.base_, prop)) {
			prepareCopy(state)
			return (state.copy_[prop] = createProxy(
				state.scope_.immer_,
				value,
				state
			))
		}
		return value
	},
	has(state, prop) {
		return prop in latest(state)
	},
	ownKeys(state) {
		return Reflect.ownKeys(latest(state))
	},
	set(state, prop /* strictly not, but helps TS */, value) {
		state.assigned_[prop] = true
		if (!state.modified_) {
			if (is(value, peek(latest(state), prop)) && value !== undefined)
				return true
			prepareCopy(state)
			markChanged(state)
		}
		// @ts-ignore
		state.copy_[prop] = value
		return true
	},
	deleteProperty(state, prop) {
		// The `undefined` check is a fast path for pre-existing keys.
		if (peek(state.base_, prop) !== undefined || prop in state.base_) {
			state.assigned_[prop] = false
			prepareCopy(state)
			markChanged(state)
		} else {
			// if an originally not assigned property was deleted
			delete state.assigned_[prop]
		}
		// @ts-ignore
		if (state.copy_) delete state.copy_[prop]
		return true
	},
	// Note: We never coerce `desc.value` into an Immer draft, because we can't make
	// the same guarantee in ES5 mode.
	getOwnPropertyDescriptor(state, prop) {
		const owner = latest(state)
		const desc = Reflect.getOwnPropertyDescriptor(owner, prop)
		if (!desc) return desc
		return {
			writable: true,
			configurable: state.type_ !== ProxyTypeProxyArray || prop !== "length",
			enumerable: desc.enumerable,
			value: owner[prop]
		}
	},
	defineProperty() {
		die(11)
	},
	getPrototypeOf(state) {
		return Object.getPrototypeOf(state.base_)
	},
	setPrototypeOf() {
		die(12)
	}
}
/**
 * Array drafts
 */
const arrayTraps = {}
each(objectTraps, (key, fn) => {
	// @ts-ignore
	arrayTraps[key] = function() {
		arguments[0] = arguments[0][0]
		return fn.apply(this, arguments)
	}
})
arrayTraps.deleteProperty = function(state, prop) {
	if (__DEV__ && isNaN(parseInt(prop))) die(13)
	return objectTraps.deleteProperty.call(this, state[0], prop)
}
arrayTraps.set = function(state, prop, value) {
	if (__DEV__ && prop !== "length" && isNaN(parseInt(prop))) die(14)
	return objectTraps.set.call(this, state[0], prop, value, state[0])
}
// Access a property without creating an Immer draft.
function peek(draft, prop) {
	const state = draft[DRAFT_STATE]
	const source = state ? latest(state) : draft
	return source[prop]
}
function readPropFromProto(state, source, prop) {
	var _a
	// 'in' checks proto!
	if (!(prop in source)) return undefined
	let proto = Object.getPrototypeOf(source)
	while (proto) {
		const desc = Object.getOwnPropertyDescriptor(proto, prop)
		// This is a very special case, if the prop is a getter defined by the
		// prototype, we should invoke it with the draft as context!
		if (desc)
			return `value` in desc
				? desc.value
				: (_a = desc.get) === null || _a === void 0
				? void 0
				: _a.call(state.draft_)
		proto = Object.getPrototypeOf(proto)
	}
	return undefined
}
export function markChanged(state) {
	if (!state.modified_) {
		state.modified_ = true
		if (state.parent_) {
			markChanged(state.parent_)
		}
	}
}
export function prepareCopy(state) {
	if (!state.copy_) {
		state.copy_ = shallowCopy(state.base_)
	}
}
