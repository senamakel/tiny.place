#!/usr/bin/env node
/**
 * i18n coverage check — verifies every locale's translation file is in parity
 * with the English source of truth.
 *
 * Inspired by the openhuman-1 `i18n-coverage` script, adapted to tiny.place's
 * nested-JSON / i18next layout. English (`en`) is the reference: every other
 * locale must define the exact same set of keys — no missing, no extra. Keys
 * whose value is byte-identical to English are reported as "untranslated"
 * (informational by default — many are legitimately identical, e.g. brand or
 * currency names like "USDC"; gate on them with --strict-untranslated).
 *
 * Usage:
 *   node scripts/i18n-coverage.mjs                 # human report, fail on missing/extra
 *   node scripts/i18n-coverage.mjs --json          # machine-readable summary
 *   node scripts/i18n-coverage.mjs --strict-untranslated   # also fail on untranslated
 *
 * Exit code 1 if any locale is missing/extra keys (or untranslated under
 * --strict-untranslated); 0 otherwise. Wired into CI via `pnpm i18n:check`.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const websiteDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const localesDir = join(websiteDir, "src/assets/locales");
const REFERENCE = "en";

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const strictUntranslated = args.includes("--strict-untranslated");

function loadLocale(code) {
	const file = join(localesDir, code, "translations.json");
	return JSON.parse(readFileSync(file, "utf8"));
}

/** Flatten a nested object to dot-path -> string-value pairs. */
function flatten(object, prefix = "", out = {}) {
	for (const [key, value] of Object.entries(object)) {
		const path = prefix ? `${prefix}.${key}` : key;
		if (value && typeof value === "object" && !Array.isArray(value)) {
			flatten(value, path, out);
		} else {
			out[path] = value;
		}
	}
	return out;
}

const locales = readdirSync(localesDir)
	.filter((entry) => statSync(join(localesDir, entry)).isDirectory())
	.sort();

if (!locales.includes(REFERENCE)) {
	console.error(`i18n-coverage: reference locale '${REFERENCE}' not found in ${localesDir}`);
	process.exit(1);
}

const en = flatten(loadLocale(REFERENCE));
const enKeys = Object.keys(en);
const enKeySet = new Set(enKeys);

const report = [];
let failed = false;

for (const code of locales) {
	if (code === REFERENCE) continue;
	let flat;
	try {
		flat = flatten(loadLocale(code));
	} catch (error) {
		report.push({ code, parseError: String(error) });
		failed = true;
		continue;
	}
	const keySet = new Set(Object.keys(flat));
	const missing = enKeys.filter((key) => !keySet.has(key));
	const extra = [...keySet].filter((key) => !enKeySet.has(key));
	const untranslated = enKeys.filter(
		(key) => keySet.has(key) && flat[key] === en[key]
	);
	const localeFailed =
		missing.length > 0 ||
		extra.length > 0 ||
		(strictUntranslated && untranslated.length > 0);
	if (localeFailed) failed = true;
	report.push({
		code,
		total: keySet.size,
		missing,
		extra,
		untranslated,
		ok: !localeFailed,
	});
}

if (asJson) {
	console.log(
		JSON.stringify(
			{ reference: REFERENCE, referenceKeys: enKeys.length, locales: report, ok: !failed },
			null,
			2
		)
	);
	process.exit(failed ? 1 : 0);
}

const sample = (list) =>
	list.slice(0, 12).join(", ") + (list.length > 12 ? ` … (+${list.length - 12} more)` : "");

console.log(`i18n coverage — reference '${REFERENCE}' has ${enKeys.length} keys\n`);
for (const entry of report) {
	if (entry.parseError) {
		console.log(`[FAIL] ${entry.code}: could not parse — ${entry.parseError}`);
		continue;
	}
	const status = entry.ok ? "ok  " : "FAIL";
	console.log(
		`[${status}] ${entry.code}: ${entry.total} keys | missing ${entry.missing.length} | extra ${entry.extra.length} | untranslated ${entry.untranslated.length}`
	);
	if (entry.missing.length) console.log(`        missing: ${sample(entry.missing)}`);
	if (entry.extra.length) console.log(`        extra:   ${sample(entry.extra)}`);
}

console.log(
	failed
		? "\n✗ i18n coverage failed — locales are out of parity with en"
		: "\n✓ i18n coverage passed — all locales in parity with en"
);
process.exit(failed ? 1 : 0);
