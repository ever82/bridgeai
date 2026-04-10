/**
 * Tests for user schemas
 */
import {
  registerUserSchema,
  loginUserSchema,
  updateUserSchema,
  changePasswordSchema,
  resetPasswordSchema,
  setNewPasswordSchema,
  listUsersQuerySchema,
  userIdParamsSchema,
  usernameParamsSchema,
  searchUsersQuerySchema,
} from '../userSchemas';

describe('User Schemas', () => {
  describe('registerUserSchema', () => {
    const validUser = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      username: 'testuser',
      displayName: 'Test User',
      phone: '+1234567890',
    };

    it('should validate a valid registration', () => {
      const result = registerUserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it('should require email', () => {
      const result = registerUserSchema.safeParse({ ...validUser, email: '' });
      expect(result.success).toBe(false);
    });

    it('should require valid email format', () => {
      const result = registerUserSchema.safeParse({ ...validUser, email: 'invalid-email' });
      expect(result.success).toBe(false);
    });

    it('should require password with at least 8 characters', () => {
      const result = registerUserSchema.safeParse({ ...validUser, password: 'Short1!' });
      expect(result.success).toBe(false);
    });

    it('should require password with uppercase', () => {
      const result = registerUserSchema.safeParse({ ...validUser, password: 'lowercase123!' });
      expect(result.success).toBe(false);
    });

    it('should require password with lowercase', () => {
      const result = registerUserSchema.safeParse({ ...validUser, password: 'UPPERCASE123!' });
      expect(result.success).toBe(false);
    });

    it('should require password with digit', () => {
      const result = registerUserSchema.safeParse({ ...validUser, password: 'NoDigitsHere!' });
      expect(result.success).toBe(false);
    });

    it('should require password with special character', () => {
      const result = registerUserSchema.safeParse({ ...validUser, password: 'NoSpecialChar123' });
      expect(result.success).toBe(false);
    });

    it('should require username with at least 3 characters', () => {
      const result = registerUserSchema.safeParse({ ...validUser, username: 'ab' });
      expect(result.success).toBe(false);
    });

    it('should reject username with invalid characters', () => {
      const result = registerUserSchema.safeParse({ ...validUser, username: 'test@user' });
      expect(result.success).toBe(false);
    });

    it('should convert email to lowercase', () => {
      const result = registerUserSchema.safeParse({ ...validUser, email: 'TEST@EXAMPLE.COM' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
      }
    });

    it('should make optional fields optional', () => {
      const minimalUser = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        username: 'testuser',
      };
      const result = registerUserSchema.safeParse(minimalUser);
      expect(result.success).toBe(true);
    });
  });

  describe('loginUserSchema', () => {
    it('should validate valid login', () => {
      const result = loginUserSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('should require email', () => {
      const result = loginUserSchema.safeParse({
        email: '',
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('should require password', () => {
      const result = loginUserSchema.safeParse({
        email: 'test@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
    });

    it('should have rememberMe default to false', () => {
      const result = loginUserSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rememberMe).toBe(false);
      }
    });
  });

  describe('updateUserSchema', () => {
    it('should validate profile update', () => {
      const result = updateUserSchema.safeParse({
        displayName: 'New Name',
        bio: 'New bio',
      });
      expect(result.success).toBe(true);
    });

    it('should allow partial updates', () => {
      const result = updateUserSchema.safeParse({
        displayName: 'New Name',
      });
      expect(result.success).toBe(true);
    });

    it('should allow empty update', () => {
      const result = updateUserSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('changePasswordSchema', () => {
    it('should validate password change', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'oldpassword',
        newPassword: 'NewSecurePass123!',
        confirmPassword: 'NewSecurePass123!',
      });
      expect(result.success).toBe(true);
    });

    it('should fail when passwords do not match', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'oldpassword',
        newPassword: 'NewSecurePass123!',
        confirmPassword: 'DifferentPassword123!',
      });
      expect(result.success).toBe(false);
    });

    it('should require all fields', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: '',
        newPassword: 'NewSecurePass123!',
        confirmPassword: 'NewSecurePass123!',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('resetPasswordSchema', () => {
    it('should validate password reset request', () => {
      const result = resetPasswordSchema.safeParse({
        email: 'test@example.com',
      });
      expect(result.success).toBe(true);
    });

    it('should require valid email', () => {
      const result = resetPasswordSchema.safeParse({
        email: 'invalid-email',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('setNewPasswordSchema', () => {
    it('should validate new password setting', () => {
      const result = setNewPasswordSchema.safeParse({
        token: 'reset-token',
        newPassword: 'NewSecurePass123!',
        confirmPassword: 'NewSecurePass123!',
      });
      expect(result.success).toBe(true);
    });

    it('should fail when passwords do not match', () => {
      const result = setNewPasswordSchema.safeParse({
        token: 'reset-token',
        newPassword: 'NewSecurePass123!',
        confirmPassword: 'DifferentPass123!',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('listUsersQuerySchema', () => {
    it('should validate with defaults', () => {
      const result = listUsersQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
        expect(result.data.sortBy).toBe('createdAt');
        expect(result.data.sortOrder).toBe('desc');
      }
    });

    it('should coerce page to number', () => {
      const result = listUsersQuerySchema.safeParse({ page: '5' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.page).toBe('number');
        expect(result.data.page).toBe(5);
      }
    });

    it('should validate sort options', () => {
      const result = listUsersQuerySchema.safeParse({ sortBy: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('should allow optional filters', () => {
      const result = listUsersQuerySchema.safeParse({
        search: 'test',
        role: 'admin',
        isActive: 'true',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('userIdParamsSchema', () => {
    it('should validate UUID format', () => {
      const result = userIdParamsSchema.safeParse({
        userId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = userIdParamsSchema.safeParse({
        userId: 'invalid-uuid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('usernameParamsSchema', () => {
    it('should validate username', () => {
      const result = usernameParamsSchema.safeParse({
        username: 'validuser',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid username', () => {
      const result = usernameParamsSchema.safeParse({
        username: 'invalid@user',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('searchUsersQuerySchema', () => {
    it('should require search query', () => {
      const result = searchUsersQuerySchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should validate search with defaults', () => {
      const result = searchUsersQuerySchema.safeParse({ q: 'test' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should limit search query length', () => {
      const result = searchUsersQuerySchema.safeParse({
        q: 'a'.repeat(101),
      });
      expect(result.success).toBe(false);
    });
  });
});
