# Jest-assignment

A TypeScript/Express salon booking API with Jest-based API automation tests for authentication and booking workflows.

## Prerequisites

- Node.js **18 or later**. Node.js 20 or 22 LTS is recommended.
- npm **9 or later**.
- Git, if cloning the repository.
- MongoDB is required only when running the application locally with `npm run dev` or `npm start`.
- MongoDB is **not required to run the Jest suite**, because the tests mock the Mongoose models.

## Dependencies

Runtime dependencies include:

- Express for the HTTP API
- Mongoose for MongoDB access
- JSON Web Token (`jsonwebtoken`) for authentication
- `bcryptjs` for password hashing and comparison
- `dotenv` for environment-variable loading
- `cors` for CORS middleware

Development and test dependencies include:

- Jest
- `ts-jest` for running TypeScript tests
- SuperTest for HTTP API requests
- TypeScript
- `tsx` for running the development server

The project uses TypeScript 5.x because the configured `ts-jest` version requires TypeScript below version 7.

## Installation

Clone the repository and install the dependencies:

```bash
git clone https://github.com/TanishaJaiswal05/Jest-assignment.git
cd Jest-assignment
npm install
```

## Environment Setup

Create a `.env` file in the repository root, next to `package.json`:

```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/salon-db
JWT_SECRET=replace-this-with-a-long-random-secret
```

### Environment variables

| Variable | Required | Description |
|---|---:|---|
| `PORT` | No | Port used by the Express server. Defaults to `3000`. |
| `MONGO_URI` | No for tests; yes for the running API | MongoDB connection string. The application defaults to a local `salon-db` database. |
| `JWT_SECRET` | No | Secret used to sign and verify JWTs. The application has a fallback value, but setting a private value is recommended. |

Do not commit `.env` or real credentials. The repository `.gitignore` already excludes `.env`, `node_modules`, and `dist`.

### MongoDB setup assumptions

The default configuration assumes MongoDB is available locally at:

```text
mongodb://127.0.0.1:27017/salon-db
```

You can use any of these options:

- A local MongoDB installation running on port `27017`.
- A MongoDB Docker container:

  ```bash
  docker run -d --name salon-mongodb -p 27017:27017 -v salon-mongodb-data:/data/db mongo:8
  ```

- A MongoDB Atlas connection string assigned to `MONGO_URI`.

If using MongoDB Atlas, allow your IP address in Atlas Network Access and replace `MONGO_URI` with your own connection string.

## Run Tests

Run the complete Jest suite with:

```bash
npm test
```

The configured test command is:

```text
jest --runInBand
```

This runs tests serially, which keeps the mocked model state isolated and produces predictable output.

To run Jest in watch mode:

```bash
npx jest --watch
```

To run a specific test file:

```bash
npx jest tests/auth-booking.test.ts --runInBand
```

## Test Configuration

Jest is configured in [`jest.config.js`](./jest.config.js):

- Uses the `ts-jest` preset.
- Uses the Node.js test environment.
- Discovers TypeScript tests under `tests/` matching `**/*.test.ts`.
- Clears mocks between tests.
- Enables verbose test output.

The main suite is [`tests/auth-booking.test.ts`](./tests/auth-booking.test.ts). It covers:

- Customer registration
- Duplicate-email registration rejection
- Login and JWT response validation
- Available salon slots
- Authenticated booking creation
- Invalid-token rejection
- Overlapping booking rejection
- Authenticated booking cancellation

The tests use SuperTest against the exported Express app and mock the User, Salon, Service, and Booking Mongoose models. This makes the suite repeatable and prevents tests from changing a real database.

## Setup and teardown requirements

No database setup or teardown is required for the Jest suite because the Mongoose models are mocked.

The tests do not start the MongoDB connection or call `app.listen`. The Express app is exported from `app.ts`, allowing SuperTest to invoke the routes directly.

For local application runs, MongoDB must be started before the server:

```bash
npm run dev
```

The application connects to MongoDB before listening on the configured port. Stop the development process with `Ctrl+C` when finished.

## Build and run the application

Compile the TypeScript source:

```bash
npm run build
```

Start the compiled application:

```bash
npm start
```

Or run the development server with automatic reload:

```bash
npm run dev
```

The API is available at:

```text
http://localhost:3000
```

The health-check endpoint is:

```text
GET http://localhost:3000/
```

## Configuration assumptions

- Tests are API-level tests using mocked persistence rather than full database-backed E2E tests.
- Test IDs and user data are deterministic mock values; they are not expected to exist in MongoDB.
- The authentication tests use the JWT secret from `JWT_SECRET` when available and the application fallback otherwise.
- The application expects booking dates in `YYYY-MM-DD` format and times in `HH:mm` format.
- A real MongoDB instance and seeded salon, service, and user data are needed for manual testing against the running API.
