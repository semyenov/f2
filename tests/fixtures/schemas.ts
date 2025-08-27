import * as Schema from '@effect/schema/Schema'

/**
 * Test fixture schemas for use across the test suite
 */

export const UserSchema = Schema.Struct({
  id: Schema.String,
  email: Schema.String,
  name: Schema.optional(Schema.String),
  createdAt: Schema.Date,
  isActive: Schema.Boolean,
})

export const ProductSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  price: Schema.Number,
  category: Schema.String,
  ownerId: Schema.String,
})

export const OrderSchema = Schema.Struct({
  id: Schema.String,
  userId: Schema.String,
  productIds: Schema.Array(Schema.String),
  total: Schema.Number,
  status: Schema.Literal('pending', 'completed', 'cancelled'),
  orderDate: Schema.Date,
})

export const ReviewSchema = Schema.Struct({
  id: Schema.String,
  productId: Schema.String,
  userId: Schema.String,
  rating: Schema.Number,
  comment: Schema.optional(Schema.String),
  createdAt: Schema.Date,
})

// Type exports for test usage
export type User = Schema.Schema.Type<typeof UserSchema>
export type Product = Schema.Schema.Type<typeof ProductSchema>
export type Order = Schema.Schema.Type<typeof OrderSchema>
export type Review = Schema.Schema.Type<typeof ReviewSchema>

// Mock data factories
export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  createdAt: new Date('2024-01-01'),
  isActive: true,
  ...overrides,
})

export const createMockProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'product-123',
  name: 'Test Product',
  price: 99.99,
  category: 'electronics',
  ownerId: 'user-123',
  ...overrides,
})

export const createMockOrder = (overrides: Partial<Order> = {}): Order => ({
  id: 'order-123',
  userId: 'user-123',
  productIds: ['product-123'],
  total: 99.99,
  status: 'pending',
  orderDate: new Date('2024-01-01'),
  ...overrides,
})

export const createMockReview = (overrides: Partial<Review> = {}): Review => ({
  id: 'review-123',
  productId: 'product-123',
  userId: 'user-123',
  rating: 5,
  comment: 'Great product!',
  createdAt: new Date('2024-01-01'),
  ...overrides,
})