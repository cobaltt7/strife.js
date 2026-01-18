import { ok } from "node:assert";
import { describe, it } from "node:test";

import { standardizeError } from "./errors.js";

describe("standardizeError", () => {
	it("should not include a stack on cause", () => {
		const error = standardizeError(new Error("message", { cause: "cause" }));
		ok("cause" in error);
		ok(error.cause);
		ok(typeof error.cause === "object");
		ok("stack" in error.cause);
		ok(error.cause.stack === undefined);
	});
});
