import { ErrorFactory } from "@core";
import { describe, expect, it } from "vitest";

describe("Errors Coverage Tests", () => {
	describe("Error Factory", () => {
		it("should create validation error", () => {
			const error = ErrorFactory.validation("Invalid input", "field");
			expect(error._tag).toBe("ValidationError");
			expect(error.message).toBe("Invalid input");
			expect(error.field).toBe("field");
		});

		it("should create schema validation error", () => {
			const violations = [
				{ path: "field", message: "Invalid type", value: 123 },
			];
			const error = ErrorFactory.schemaValidation(
				"UserSchema",
				"Schema failed",
				violations,
			);
			expect(error._tag).toBe("SchemaValidationError");
			expect(error.message).toContain("Schema failed");
		});

		it("should create field resolution error", () => {
			const error = ErrorFactory.fieldResolution(
				"Field failed",
				"field",
				"Type",
			);
			expect(error._tag).toBe("FieldResolutionError");
			expect(error.message).toContain("Field failed");
		});

		it("should create entity resolution error", () => {
			const error = ErrorFactory.entityResolution(
				"Entity failed",
				"Entity",
				"ref",
			);
			expect(error._tag).toBe("EntityResolutionError");
			expect(error.entityType).toBe("Entity");
			expect(error.entityId).toBe("ref");
			expect(error.message).toContain("Entity failed");
		});

		it("should create federation error", () => {
			const error = ErrorFactory.federation(
				"Federation failed",
				"subgraph",
				"op",
			);
			expect(error._tag).toBe("FederationError");
			expect(error.subgraphId).toBe("subgraph");
			expect(error.operationType).toBe("op");
			expect(error.message).toContain("Federation failed");
		});

		it("should create composition error", () => {
			const error = ErrorFactory.composition(
				"Composition failed",
				undefined,
				"Type",
			);
			expect(error._tag).toBe("CompositionError");
			expect(error.message).toContain("Composition failed");
		});

		it("should create health check error", () => {
			const error = ErrorFactory.healthCheck("Health failed", "service");
			expect(error._tag).toBe("HealthCheckError");
			expect(error.serviceId).toBe("service");
		});
	});

	describe("Common Errors", () => {
		it("should create discovery error", () => {
			const error = ErrorFactory.CommonErrors.discoveryError(
				"Discovery failed",
				"endpoint",
			);
			expect(error._tag).toBe("DiscoveryError");
			expect(error.endpoint).toBe("endpoint");
		});

		it("should create registration error", () => {
			const error = ErrorFactory.CommonErrors.registrationError(
				"Registration failed",
				"service",
			);
			expect(error._tag).toBe("RegistrationError");
			expect(error.serviceId).toBe("service");
		});

		it("should handle errors with causes", () => {
			const cause = new Error("Root cause");
			const error = ErrorFactory.CommonErrors.discoveryError(
				"Failed",
				"endpoint",
				cause,
			);
			expect(error.cause).toBe(cause);
		});
	});

	describe("Error Properties", () => {
		it("should include timestamps", () => {
			const error = ErrorFactory.validation("Test");
			expect(error.timestamp).toBeInstanceOf(Date);
		});

		it("should include error codes", () => {
			const error = ErrorFactory.federation("Test");
			expect(error.code).toBeDefined();
		});

		it("should include severity levels", () => {
			const error = ErrorFactory.composition("Test");
			expect(error.severity).toBeDefined();
		});

		it("should include category", () => {
			const error = ErrorFactory.healthCheck("Test", "service");
			expect(error.category).toBeDefined();
		});

		it("should include retryable flag", () => {
			const error = ErrorFactory.CommonErrors.discoveryError(
				"Test",
				"endpoint",
			);
			expect(typeof error.retryable).toBe("boolean");
		});
	});

	describe("Error Context", () => {
		it("should handle validation context", () => {
			const error = ErrorFactory.validation("Missing value", "field", null);
			expect(error._tag).toBe("ValidationError");
			expect(error.field).toBe("field");
			expect(error.value).toBe(null);
		});

		it("should handle composition errors", () => {
			const error = ErrorFactory.composition("Conflicts", undefined, "Type");
			expect(error._tag).toBe("CompositionError");
			expect(error.message).toContain("Conflicts");
		});

		it("should preserve error messages", () => {
			const message = "Detailed error message with context";
			const error = ErrorFactory.federation(message);
			expect(error.message).toBe(message);
		});
	});
});
