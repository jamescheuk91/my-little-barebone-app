# Next.js Project Guidelines

## Build Commands
- `npm run dev` - Run development server with Turbopack
- `npm run build` - Build the application
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npx jest [testname]` - Run a single test (when tests are added)

## Code Style
- Use TypeScript with strict type checking
- Follow the `@/` path alias for imports from src directory
- Use React 19 functional components and hooks
- Use TailwindCSS for styling
- Follow ESLint rules from next/core-web-vitals and next/typescript
- Prefer async/await over promise chains
- Use descriptive variable/function names in camelCase (components in PascalCase)
- Destructure props in component parameters
- Handle errors with proper try/catch blocks and error boundaries