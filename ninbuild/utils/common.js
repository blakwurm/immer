import {
	DRAFT_STATE,
	DRAFTABLE,
	hasSet,
	hasMap,
	ArchtypeObject,
	ArchtypeArray,
	ArchtypeMap,
	ArchtypeSet,
	die
} from "../internal.js"
/** Returns true if the given value is an Immer draft */
/*#__PURE__*/
export function isDraft(value) {
	return !!value && !!value[DRAFT_STATE]
}
/** Returns true if the given value can be drafted by Immer */
/*#__PURE__*/
export function isDraftable(value) {
	if (!value) return false
	return (
		isPlainObject(value) ||
		Array.isArray(value) ||
		!!value[DRAFTABLE] ||
		!!value.constructor[DRAFTABLE] ||
		isMap(value) ||
		isSet(value)
	)
}
/*#__PURE__*/
export function isPlainObject(value) {
	if (!value || typeof value !== "object") return false
	const proto = Object.getPrototypeOf(value)
	return !proto || proto === Object.prototype
}
export function original(value) {
	if (!isDraft(value)) die(23, value)
	return value[DRAFT_STATE].base_
}
/*#__PURE__*/
export const ownKeys =
	typeof Reflect !== "undefined" && Reflect.ownKeys
		? Reflect.ownKeys
		: typeof Object.getOwnPropertySymbols !== "undefined"
		? obj =>
				Object.getOwnPropertyNames(obj).concat(
					Object.getOwnPropertySymbols(obj)
				)
		: /* istanbul ignore next */ Object.getOwnPropertyNames
export const getOwnPropertyDescriptors =
	Object.getOwnPropertyDescriptors ||
	function getOwnPropertyDescriptors(target) {
		// Polyfill needed for Hermes and IE, see https://github.com/facebook/hermes/issues/274
		const res = {}
		ownKeys(target).forEach(key => {
			res[key] = Object.getOwnPropertyDescriptor(target, key)
		})
		return res
	}
export function each(obj, iter, enumerableOnly = false) {
	if (getArchtype(obj) === ArchtypeObject) {
		;(enumerableOnly ? Object.keys : ownKeys)(obj).forEach(key => {
			if (!enumerableOnly || typeof key !== "symbol") iter(key, obj[key], obj)
		})
	} else {
		obj.forEach((entry, index) => iter(index, entry, obj))
	}
}
/*#__PURE__*/
export function getArchtype(thing) {
	/* istanbul ignore next */
	const state = thing[DRAFT_STATE]
	return state
		? state.type_ > 3
			? state.type_ - 4 // cause Object and Array map back from 4 and 5
			: state.type_ // others are the same
		: Array.isArray(thing)
		? ArchtypeArray
		: isMap(thing)
		? ArchtypeMap
		: isSet(thing)
		? ArchtypeSet
		: ArchtypeObject
}
/*#__PURE__*/
export function has(thing, prop) {
	return getArchtype(thing) === ArchtypeMap
		? thing.has(prop)
		: Object.prototype.hasOwnProperty.call(thing, prop)
}
/*#__PURE__*/
export function get(thing, prop) {
	// @ts-ignore
	return getArchtype(thing) === ArchtypeMap ? thing.get(prop) : thing[prop]
}
/*#__PURE__*/
export function set(thing, propOrOldValue, value) {
	const t = getArchtype(thing)
	if (t === ArchtypeMap) thing.set(propOrOldValue, value)
	else if (t === ArchtypeSet) {
		thing.delete(propOrOldValue)
		thing.add(value)
	} else thing[propOrOldValue] = value
}
/*#__PURE__*/
export function is(x, y) {
	// From: https://github.com/facebook/fbjs/blob/c69904a511b900266935168223063dd8772dfc40/packages/fbjs/src/core/shallowEqual.js
	if (x === y) {
		return x !== 0 || 1 / x === 1 / y
	} else {
		return x !== x && y !== y
	}
}
/*#__PURE__*/
export function isMap(target) {
	return hasMap && target instanceof Map
}
/*#__PURE__*/
export function isSet(target) {
	return hasSet && target instanceof Set
}
/*#__PURE__*/
export function latest(state) {
	return state.copy_ || state.base_
}
/*#__PURE__*/
export function shallowCopy(base) {
	if (Array.isArray(base)) return base.slice()
	const descriptors = getOwnPropertyDescriptors(base)
	delete descriptors[DRAFT_STATE]
	let keys = ownKeys(descriptors)
	for (let i = 0; i < keys.length; i++) {
		const key = keys[i]
		const desc = descriptors[key]
		if (desc.writable === false) {
			desc.writable = true
			desc.configurable = true
		}
		// like object.assign, we will read any _own_, get/set accessors. This helps in dealing
		// with libraries that trap values, like mobx or vue
		// unlike object.assign, non-enumerables will be copied as well
		if (desc.get || desc.set)
			descriptors[key] = {
				configurable: true,
				writable: true,
				enumerable: desc.enumerable,
				value: base[key]
			}
	}
	return Object.create(Object.getPrototypeOf(base), descriptors)
}
export function freeze(obj, deep) {
	if (isFrozen(obj) || isDraft(obj) || !isDraftable(obj)) return
	if (getArchtype(obj) > 1 /* Map or Set */) {
		obj.set = obj.add = obj.clear = obj.delete = dontMutateFrozenCollections
	}
	Object.freeze(obj)
	if (deep) each(obj, (key, value) => freeze(value, true), true)
}
function dontMutateFrozenCollections() {
	die(2)
}
export function isFrozen(obj) {
	if (obj == null || typeof obj !== "object") return true
	// See #600, IE dies on non-objects in Object.isFrozen
	return Object.isFrozen(obj)
}
