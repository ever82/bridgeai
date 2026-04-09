# 单元测试最佳实践

## 测试结构

每个测试文件应该遵循以下结构：

```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Feature/Module Name', () => {
  // 1. 共享的 setup/teardown
  beforeAll(() => {
    // 在所有测试之前执行一次
  });

  afterAll(() => {
    // 在所有测试之后执行一次
  });

  beforeEach(() => {
    // 在每个测试之前执行
  });

  afterEach(() => {
    // 在每个测试之后执行
  });

  // 2. 测试分组 (describe blocks)
  describe('methodName', () => {
    // 3. 具体的测试用例 (it blocks)
    it('should do something when condition', () => {
      // Arrange
      const input = ...;

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

## 命名规范

### 测试文件名
- 格式: `{filename}.test.ts`
- 位置: 与源代码文件同目录或 `__tests__` 子目录

### describe/it 命名
- `describe`: 描述被测试的功能/模块/方法
- `it`: 以 "should" 开头，描述具体行为和期望结果

```typescript
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a new user with valid data', () => { ... });
    it('should throw error when email already exists', () => { ... });
    it('should hash password before saving', () => { ... });
  });
});
```

## AAA 模式 (Arrange-Act-Assert)

每个测试应该清晰地分为三个部分：

```typescript
it('should calculate total price with discount', () => {
  // Arrange - 准备测试数据
  const cart = createCart({ items: [
    { price: 100, quantity: 2 },
    { price: 50, quantity: 1 }
  ]});
  const discountCode = 'SAVE20';

  // Act - 执行被测试的操作
  const total = calculateTotal(cart, discountCode);

  // Assert - 验证结果
  expect(total).toBe(200); // (100*2 + 50*1) * 0.8
});
```

## 使用 Factories

使用工厂函数创建测试数据，而不是硬编码：

```typescript
// Good
const user = createUser({ email: 'test@example.com' });

// Avoid
const user = {
  id: '123',
  email: 'test@example.com',
  name: 'Test User',
  // ... 其他字段
};
```

## 使用 Mocks

### Mock 外部依赖

```typescript
import { mockPrisma, resetPrismaMocks } from '../__tests__/mocks';

beforeEach(() => {
  resetPrismaMocks();
});

it('should return user from database', async () => {
  const mockUser = createUser();
  mockPrisma.user.findUnique.mockResolvedValue(mockUser);

  const result = await userService.getUser(mockUser.id);

  expect(result).toEqual(mockUser);
  expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
    where: { id: mockUser.id }
  });
});
```

### Mock Express 对象

```typescript
import { createMockMiddlewareArgs } from '../__tests__/helpers';

it('should handle request', () => {
  const { req, res, next } = createMockMiddlewareArgs({
    body: { email: 'test@example.com' }
  });

  middleware(req, res, next);

  expect(res.statusCode).toBe(200);
});
```

## 测试隔离

每个测试应该独立运行，不依赖其他测试：

```typescript
// Good
beforeEach(() => {
  // 重置所有 mocks
  jest.clearAllMocks();
  // 清理数据库状态
  return db.clean();
});
```

## 测试覆盖率

项目要求 80% 的代码覆盖率：

```bash
# 运行测试并生成覆盖率报告
pnpm test --coverage

# 只运行特定文件
pnpm test -- src/utils/__tests__/response.test.ts

# 使用 watch 模式
pnpm test --watch
```

## 常见测试模式

### 测试异步代码

```typescript
it('should fetch user data', async () => {
  const user = await fetchUser('123');
  expect(user).toBeDefined();
});

it('should handle fetch error', async () => {
  mockPrisma.user.findUnique.mockRejectedValue(new Error('DB Error'));

  await expect(fetchUser('123')).rejects.toThrow('DB Error');
});
```

### 测试异常

```typescript
it('should throw when user not found', async () => {
  mockPrisma.user.findUnique.mockResolvedValue(null);

  await expect(userService.getUser('999'))
    .rejects
    .toThrow(NotFoundError);
});
```

### 测试回调函数

```typescript
it('should call callback with result', () => {
  const callback = jest.fn();

  doSomething(callback);

  expect(callback).toHaveBeenCalledWith(expectedResult);
  expect(callback).toHaveBeenCalledTimes(1);
});
```

## 避免

### 避免测试多个概念

```typescript
// Avoid - 测试太多东西
it('should work correctly', () => {
  // 测试创建
  // 测试更新
  // 测试删除
});

// Good - 分开测试
it('should create user', () => { ... });
it('should update user', () => { ... });
it('should delete user', () => { ... });
```

### 避免条件逻辑

```typescript
// Avoid
it('should handle users', () => {
  for (const user of users) {
    if (user.isActive) {
      // ...
    }
  }
});

// Good - 使用数据驱动测试
it.each(activeUsers)('should handle active user $name', (user) => {
  // ...
});
```

### 避免硬编码的魔术数字

```typescript
// Avoid
expect(result).toBe(42);

// Good
const EXPECTED_RESULT = 42;
expect(result).toBe(EXPECTED_RESULT);
```

## 运行测试

```bash
# 运行所有测试
pnpm test

# 运行特定文件
pnpm test -- response.test.ts

# 运行匹配模式的测试
pnpm test -- --testNamePattern="should create"

# 生成覆盖率报告
pnpm test -- --coverage

# 持续监视模式
pnpm test -- --watch
```
