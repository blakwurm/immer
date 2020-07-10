import {die, __DEV__} from "../internal.js"
/** Plugin utilities */
const plugins = {}
export function getPlugin(pluginKey) {
	const plugin = plugins[pluginKey]
	if (!plugin) {
		die(__DEV__ ? 18 : 19, pluginKey)
	}
	// @ts-ignore
	return plugin
}
export function loadPlugin(pluginKey, implementation) {
	plugins[pluginKey] = implementation
}
