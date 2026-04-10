/**
 * Tests for mobile validation utilities
 */
import {
  emailRule,
  passwordRule,
  usernameRule,
  displayNameRule,
  phoneRule,
  bioRule,
  loginSchema,
  registerSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  sendMessageSchema,
  createConversationSchema,
  validateField,
  validateForm,
  getPasswordStrength,
  getPasswordStrengthLabel,
  formatPhoneNumber,
  validateFileType,
  validateFileSize,
} from '../validation';

describe('Mobile Validation', () => {
  describe('emailRule', () => {
    it('should validate correct email', () => {
      const result = emailRule.safeParse('test@example.com');
      expect(result.success).toBe(true);
    });

    it('should reject empty email', () => {
      const result = emailRule.safeParse('');
      expect(result.success).toBe(false);
    });

    it('should reject invalid email format', () => {
      const result = emailRule.safeParse('invalid-email');
      expect(result.success).toBe(false);
    });

    it('should reject too long email', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      const result = emailRule.safeParse(longEmail);
      expect(result.success).toBe(false);
    });
  });

  describe('passwordRule', () => {
    it('should validate strong password', () => {
      const result = passwordRule.safeParse('SecurePass123!');
      expect(result.success).toBe(true);
    });

    it('should reject short password', () => {
      const result = passwordRule.safeParse('Short1!');
      expect(result.success).toBe(false);
    });

    it('should reject password without uppercase', () => {
      const result = passwordRule.safeParse('lowercase123!');
      expect(result.success).toBe(false);
    });

    it('should reject password without lowercase', () => {
      const result = passwordRule.safeParse('UPPERCASE123!');
      expect(result.success).toBe(false);
    });

    it('should reject password without digit', () => {
      const result = passwordRule.safeParse('NoDigitsHere!');
      expect(result.success).toBe(false);
    });

    it('should reject password without special char', () => {
      const result = passwordRule.safeParse('NoSpecialChar123');
      expect(result.success).toBe(false);
    });
  });

  describe('usernameRule', () => {
    it('should validate correct username', () => {
      const result = usernameRule.safeParse('testuser');
      expect(result.success).toBe(true);
    });

    it('should reject short username', () => {
      const result = usernameRule.safeParse('ab');
      expect(result.success).toBe(false);
    });

    it('should reject username with invalid chars', () => {
      const result = usernameRule.safeParse('test@user');
      expect(result.success).toBe(false);
    });

    it('should allow underscores and hyphens', () => {
      const result = usernameRule.safeParse('test_user-123');
      expect(result.success).toBe(true);
    });
  });

  describe('displayNameRule', () => {
    it('should validate display name', () => {
      const result = displayNameRule.safeParse('John Doe');
      expect(result.success).toBe(true);
    });

    it('should reject empty display name', () => {
      const result = displayNameRule.safeParse('');
      expect(result.success).toBe(false);
    });

    it('should reject too long display name', () => {
      const result = displayNameRule.safeParse('a'.repeat(51));
      expect(result.success).toBe(false);
    });
  });

  describe('phoneRule', () => {
    it('should validate international phone', () => {
      const result = phoneRule.safeParse('+1234567890');
      expect(result.success).toBe(true);
    });

    it('should validate Chinese phone', () => {
      const result = phoneRule.safeParse('+8613800138000');
      expect(result.success).toBe(true);
    });

    it('should reject invalid format', () => {
      const result = phoneRule.safeParse('1234567890');
      expect(result.success).toBe(false);
    });

    it('should allow empty string', () => {
      const result = phoneRule.safeParse('');
      expect(result.success).toBe(true);
    });

    it('should allow undefined', () => {
      const result = phoneRule.safeParse(undefined);
      expect(result.success).toBe(true);
    });
  });

  describe('bioRule', () => {
    it('should validate bio', () => {
      const result = bioRule.safeParse('This is my bio');
      expect(result.success).toBe(true);
    });

    it('should reject too long bio', () => {
      const result = bioRule.safeParse('a'.repeat(501));
      expect(result.success).toBe(false);
    });

    it('should allow empty string', () => {
      const result = bioRule.safeParse('');
      expect(result.success).toBe(true);
    });
  });

  describe('loginSchema', () => {
    it('should validate login', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('should require email', () => {
      const result = loginSchema.safeParse({
        email: '',
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('should require password', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    const validRegistration = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!',
      agreeToTerms: true,
    };

    it('should validate registration', () => {
      const result = registerSchema.safeParse(validRegistration);
      expect(result.success).toBe(true);
    });

    it('should require terms agreement', () => {
      const result = registerSchema.safeParse({
        ...validRegistration,
        agreeToTerms: false,
      });
      expect(result.success).toBe(false);
    });

    it('should require password match', () => {
      const result = registerSchema.safeParse({
        ...validRegistration,
        confirmPassword: 'DifferentPass123!',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateProfileSchema', () => {
    it('should validate profile update', () => {
      const result = updateProfileSchema.safeParse({
        displayName: 'New Name',
        bio: 'New bio',
      });
      expect(result.success).toBe(true);
    });

    it('should allow partial updates', () => {
      const result = updateProfileSchema.safeParse({
        displayName: 'New Name',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('changePasswordSchema', () => {
    it('should validate password change', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'oldpass',
        newPassword: 'NewSecurePass123!',
        confirmPassword: 'NewSecurePass123!',
      });
      expect(result.success).toBe(true);
    });

    it('should require password match', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'oldpass',
        newPassword: 'NewSecurePass123!',
        confirmPassword: 'DifferentPass123!',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('forgotPasswordSchema', () => {
    it('should validate forgot password', () => {
      const result = forgotPasswordSchema.safeParse({
        email: 'test@example.com',
      });
      expect(result.success).toBe(true);
    });

    it('should require valid email', () => {
      const result = forgotPasswordSchema.safeParse({
        email: 'invalid-email',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('resetPasswordSchema', () => {
    it('should validate reset password', () => {
      const result = resetPasswordSchema.safeParse({
        password: 'NewSecurePass123!',
        confirmPassword: 'NewSecurePass123!',
      });
      expect(result.success).toBe(true);
    });

    it('should require password match', () => {
      const result = resetPasswordSchema.safeParse({
        password: 'NewSecurePass123!',
        confirmPassword: 'DifferentPass123!',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('sendMessageSchema', () => {
    it('should validate message', () => {
      const result = sendMessageSchema.safeParse({
        content: 'Hello!',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty message', () => {
      const result = sendMessageSchema.safeParse({
        content: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject too long message', () => {
      const result = sendMessageSchema.safeParse({
        content: 'a'.repeat(10001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createConversationSchema', () => {
    it('should validate conversation creation', () => {
      const result = createConversationSchema.safeParse({
        title: 'My Conversation',
      });
      expect(result.success).toBe(true);
    });

    it('should allow empty title', () => {
      const result = createConversationSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('validateField', () => {
    it('should return valid for correct value', () => {
      const result = validateField(emailRule, 'test@example.com');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return error for invalid value', () => {
      const result = validateField(emailRule, 'invalid');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('validateForm', () => {
    it('should validate correct form', () => {
      const result = validateForm(loginSchema, {
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.valid).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should return errors for invalid form', () => {
      const result = validateForm(loginSchema, {
        email: 'invalid',
        password: '',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('getPasswordStrength', () => {
    it('should return 0 for empty password', () => {
      expect(getPasswordStrength('')).toBe(0);
    });

    it('should return higher score for stronger password', () => {
      const weakScore = getPasswordStrength('password');
      const strongScore = getPasswordStrength('SecurePass123!');
      expect(strongScore).toBeGreaterThan(weakScore);
    });

    it('should return max score of 5', () => {
      const score = getPasswordStrength('VerySecurePass123!@#');
      expect(score).toBeLessThanOrEqual(5);
    });
  });

  describe('getPasswordStrengthLabel', () => {
    it('should return label for score 0', () => {
      const result = getPasswordStrengthLabel(0);
      expect(result.label).toBe('Very Weak');
    });

    it('should return label for score 5', () => {
      const result = getPasswordStrengthLabel(5);
      expect(result.label).toBe('Very Strong');
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format US number', () => {
      const result = formatPhoneNumber('+12345678901');
      expect(result).toBe('+1 (234) 567-8901');
    });

    it('should format Chinese number', () => {
      const result = formatPhoneNumber('+8613800138000');
      expect(result).toBe('+86 138 0013 8000');
    });

    it('should return empty for empty input', () => {
      expect(formatPhoneNumber('')).toBe('');
    });

    it('should remove non-numeric chars', () => {
      const result = formatPhoneNumber('+1 (234) 567-8901');
      expect(result).toBe('+1 (234) 567-8901');
    });
  });

  describe('validateFileType', () => {
    it('should validate by extension', () => {
      const result = validateFileType({ name: 'photo.jpg', type: 'image/jpeg' }, ['jpg', 'png']);
      expect(result).toBe(true);
    });

    it('should validate by MIME type', () => {
      const result = validateFileType({ name: 'photo.jpg', type: 'image/jpeg' }, ['image/jpeg']);
      expect(result).toBe(true);
    });

    it('should reject invalid type', () => {
      const result = validateFileType({ name: 'file.exe', type: 'application/x-msdownload' }, ['jpg', 'png']);
      expect(result).toBe(false);
    });
  });

  describe('validateFileSize', () => {
    it('should validate size under limit', () => {
      const result = validateFileSize({ size: 1024 }, 2048);
      expect(result).toBe(true);
    });

    it('should reject size over limit', () => {
      const result = validateFileSize({ size: 2048 }, 1024);
      expect(result).toBe(false);
    });
  });
});
