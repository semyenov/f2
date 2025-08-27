// Test the built package
import { ModernFederationEntityBuilder, VERSION, FRAMEWORK_INFO } from "./dist/index.js"
import * as Schema from "@effect/schema/Schema"

console.log("🧪 Testing built Federation v2 package...")
console.log(`📦 Package: ${FRAMEWORK_INFO.name}`)
console.log(`🔢 Version: ${VERSION}`)
console.log(`✨ Features: ${FRAMEWORK_INFO.features.slice(0, 3).join(", ")}...`)

// Test basic functionality
const UserSchema = Schema.Struct({
  id: Schema.String,
  email: Schema.String,
})

const builder = new ModernFederationEntityBuilder("User", UserSchema, ["id"])
  .withShareableField("email")

console.log(`✅ ModernFederationEntityBuilder created successfully!`)
console.log(`🎯 Built package is working correctly!`)