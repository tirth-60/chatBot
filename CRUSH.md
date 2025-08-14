# CRUSH.md - Chatbot Project Guidelines

## Build/Run Commands
- **Start Server:** `node server.js`
- **Install Dependencies:** `npm install`

## Code Style Guidelines

Since no specific linting or formatting configurations were found, adhere to the following general guidelines:

### General
- **Consistency:** Maintain consistent style with existing code in the file you are modifying.
- **Readability:** Prioritize clear, readable code.

### Imports
- Group imports, with external modules first, then local modules.
- Use `require()` for common JS module imports.

### Formatting
- Use 2 spaces for indentation.
- Use single quotes for strings unless double quotes are needed for internal quotes.
- Place opening curly braces on the same line as the statement.

### Naming Conventions
- **Variables & Functions:** `camelCase` (e.g., `myVariable`, `calculateSum`).
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `MAX_RETRIES`).

### Error Handling
- Use `try...catch` blocks for asynchronous operations and error-prone code.
- Log errors appropriately.

### Types
- While explicit types are not used in this JavaScript project, ensure clear variable names and consistent data handling.

---
💘 Generated with Crush
Co-Authored-By: Crush <crush@charm.land>
