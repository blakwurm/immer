import {enableES5} from "./es5.js"
import {enableMapSet} from "./mapset.js"
import {enablePatches} from "./patches.js"
export function enableAllPlugins() {
	enableES5()
	enableMapSet()
	enablePatches()
}
