/**
 * RBAC Service Tests
 */
import { RBACService, DEFAULT_ROLES, DEFAULT_PERMISSIONS } from '../../src/services/rbacService';
import { prisma } from '../../src/lib/prisma';

// Mock Prisma
jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    role: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    permission: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    rolePermission: {
      upsert: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    userRole: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

// Mock audit service
jest.mock('../../src/services/auditService', () => ({
  auditService: {
    log: jest.fn(),
  },
}));

describe('RBACService', () => {
  let rbacService: RBACService;

  beforeEach(() => {
    rbacService = new RBACService();
    jest.clearAllMocks();
  });

  describe('initializeDefaults', () => {
    it('should create default permissions', async () => {
      (prisma.permission.upsert as jest.Mock).mockResolvedValue({});
      (prisma.role.upsert as jest.Mock).mockResolvedValue({ id: 'role-1' });
      (prisma.permission.findUnique as jest.Mock).mockResolvedValue(null);

      await rbacService.initializeDefaults();

      expect(prisma.permission.upsert).toHaveBeenCalledTimes(DEFAULT_PERMISSIONS.length);
    });

    it('should create default roles', async () => {
      (prisma.permission.upsert as jest.Mock).mockResolvedValue({});
      (prisma.role.upsert as jest.Mock).mockResolvedValue({ id: 'role-1' });
      (prisma.permission.findUnique as jest.Mock).mockResolvedValue(null);

      await rbacService.initializeDefaults();

      expect(prisma.role.upsert).toHaveBeenCalledTimes(Object.keys(DEFAULT_ROLES).length);
    });
  });

  describe('getAllRoles', () => {
    it('should return all roles with permissions and user count', async () => {
      const mockRoles = [
        {
          id: 'role-1',
          name: 'admin',
          permissions: [],
          _count: { users: 5 },
        },
      ];
      (prisma.role.findMany as jest.Mock).mockResolvedValue(mockRoles);

      const result = await rbacService.getAllRoles();

      expect(result).toEqual(mockRoles);
      expect(prisma.role.findMany).toHaveBeenCalledWith({
        include: expect.any(Object),
        orderBy: { level: 'desc' },
      });
    });
  });

  describe('createRole', () => {
    it('should create a new role with permissions', async () => {
      const mockRole = {
        id: 'role-1',
        name: 'test-role',
        displayName: 'Test Role',
      };
      (prisma.role.create as jest.Mock).mockResolvedValue(mockRole);
      (prisma.rolePermission.createMany as jest.Mock).mockResolvedValue({});
      (prisma.role.findUnique as jest.Mock).mockResolvedValue(mockRole);

      const result = await rbacService.createRole({
        name: 'test-role',
        displayName: 'Test Role',
        permissionIds: ['perm-1', 'perm-2'],
      });

      expect(result).toEqual(mockRole);
      expect(prisma.role.create).toHaveBeenCalled();
    });
  });

  describe('assignRole', () => {
    it('should assign role to user', async () => {
      (prisma.role.findUnique as jest.Mock).mockResolvedValue({ id: 'role-1', name: 'admin' });
      (prisma.userRole.upsert as jest.Mock).mockResolvedValue({});

      await rbacService.assignRole('user-1', 'role-1', 'admin-1');

      expect(prisma.userRole.upsert).toHaveBeenCalledWith({
        where: {
          userId_roleId: {
            userId: 'user-1',
            roleId: 'role-1',
          },
        },
        update: expect.any(Object),
        create: expect.any(Object),
      });
    });

    it('should throw error if role not found', async () => {
      (prisma.role.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(rbacService.assignRole('user-1', 'role-1')).rejects.toThrow('Role not found');
    });
  });

  describe('removeRole', () => {
    it('should remove role from user', async () => {
      (prisma.userRole.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      await rbacService.removeRole('user-1', 'role-1');

      expect(prisma.userRole.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          roleId: 'role-1',
        },
      });
    });
  });

  describe('hasRole', () => {
    it('should return true if user has role', async () => {
      (prisma.userRole.findMany as jest.Mock).mockResolvedValue([
        { role: { name: 'admin' } },
      ]);

      const result = await rbacService.hasRole('user-1', 'admin');

      expect(result).toBe(true);
    });

    it('should return false if user does not have role', async () => {
      (prisma.userRole.findMany as jest.Mock).mockResolvedValue([
        { role: { name: 'user' } },
      ]);

      const result = await rbacService.hasRole('user-1', 'admin');

      expect(result).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('should return true if user has exact permission', async () => {
      (prisma.userRole.findMany as jest.Mock).mockResolvedValue([
        { roleId: 'role-1' },
      ]);
      (prisma.permission.findMany as jest.Mock).mockResolvedValue([
        { name: 'users:read', resource: 'users', action: 'read' },
      ]);

      const result = await rbacService.hasPermission('user-1', 'users:read');

      expect(result).toBe(true);
    });

    it('should return true if user has wildcard permission', async () => {
      (prisma.userRole.findMany as jest.Mock).mockResolvedValue([
        { roleId: 'role-1' },
      ]);
      (prisma.permission.findMany as jest.Mock).mockResolvedValue([
        { name: '*:admin', resource: '*', action: 'admin' },
      ]);

      const result = await rbacService.hasPermission('user-1', 'users:delete');

      expect(result).toBe(true);
    });

    it('should return false if user does not have permission', async () => {
      (prisma.userRole.findMany as jest.Mock).mockResolvedValue([
        { roleId: 'role-1' },
      ]);
      (prisma.permission.findMany as jest.Mock).mockResolvedValue([
        { name: 'users:read', resource: 'users', action: 'read' },
      ]);

      const result = await rbacService.hasPermission('user-1', 'users:delete');

      expect(result).toBe(false);
    });
  });

  describe('deleteRole', () => {
    it('should delete non-system role', async () => {
      (prisma.role.findUnique as jest.Mock).mockResolvedValue({
        id: 'role-1',
        name: 'custom-role',
        isSystem: false,
      });
      (prisma.role.delete as jest.Mock).mockResolvedValue({});

      await rbacService.deleteRole('role-1');

      expect(prisma.role.delete).toHaveBeenCalledWith({
        where: { id: 'role-1' },
      });
    });

    it('should throw error when deleting system role', async () => {
      (prisma.role.findUnique as jest.Mock).mockResolvedValue({
        id: 'role-1',
        name: 'admin',
        isSystem: true,
      });

      await expect(rbacService.deleteRole('role-1')).rejects.toThrow('Cannot delete system roles');
    });

    it('should throw error if role not found', async () => {
      (prisma.role.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(rbacService.deleteRole('role-1')).rejects.toThrow('Role not found');
    });
  });
});
