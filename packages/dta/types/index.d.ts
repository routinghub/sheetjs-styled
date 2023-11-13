import type { WorkBook } from "xlsx";

/** Set internal instance of `utils`
 *
 * Usage:
 *
 * ```js
 * const XLSX = require("xlsx");
 * const DTA = require("dta");
 * DTA.set_utils(XLSX.utils);
 * ```
 *
 * @param utils utils object
 */
export function set_utils(utils: any): void;

/** Parse DTA file
 *
 * NOTE: In NodeJS, `Buffer` extends `Uint8Array`
 *
 * @param {Uint8Array} data File data
 */
export function parse(data: Uint8Array): WorkBook
