# Contributing to UplyTech Central API

Thank you for your interest in contributing to the UplyTech Central API!

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and configure
4. Generate Prisma client: `npx prisma generate`
5. Run migrations: `npx prisma migrate dev`
6. Start dev server: `npm run dev`

## Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation updates
- `chore/` - Maintenance tasks

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add user avatar upload endpoint
fix: resolve economy transfer race condition
docs: update API reference for payments module
refactor: simplify permission check logic
chore: update dependencies
```

## Code Style

- TypeScript strict mode - no `any` types without justification
- Follow existing patterns: Service → Controller → Router
- All imports at the top of files
- Use Prisma types and enums, not raw strings
- Every service method should emit relevant events via `eventBus`
- Every write operation should create an audit entry

## Adding a New Module

1. Create the directory: `src/modules/{module-name}/`
2. Create three files:
   - `service/{module-name}.service.ts` - Business logic
   - `controller/{module-name}.controller.ts` - Request handling
   - `router/{module-name}.router.ts` - Route definitions
3. Add the Prisma model to `prisma/schema.prisma`
4. Register the router in `src/app.ts`
5. Run `npx prisma generate` and `npx prisma migrate dev`

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Ensure `npx tsc --noEmit` passes with 0 errors
4. Ensure `npm run lint` passes with 0 errors
5. Write a clear PR description
6. Request review

## Reporting Issues

Use GitHub Issues with the provided templates:
- **Bug Report** - For bugs and unexpected behavior
- **Feature Request** - For new features and improvements
- **Security Report** - For security vulnerabilities (use responsible disclosure)
