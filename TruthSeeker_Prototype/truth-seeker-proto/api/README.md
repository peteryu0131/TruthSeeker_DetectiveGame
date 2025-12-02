# Truth Seeker API Server

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm run server
```

Or for development with auto-reload:
```bash
npm run server:dev
```

The server will start on `http://localhost:3000`

### 3. Test the API

**Important: You need TWO terminal windows for testing!**

#### Step 1: Start the Server (Terminal 1)
Keep the server running in the first terminal:
```bash
npm run server
```

You should see: `Truth Seeker API server running on http://localhost:3000`

**Keep this terminal open and running!**

#### Step 2: Run Tests (Terminal 2)
Open a **second terminal window** and run the test suite:
```bash
npm run test:api
```

Or run manually:
```bash
node api/test_api.js
```

The test script will automatically test all API endpoints in sequence.

#### Manual Testing (Optional)
If you want to test individual endpoints manually, you can use curl in Terminal 2:

**Health Check:**
```bash
curl http://localhost:3000/api/health
```

**Get Stories:**
```bash
curl http://localhost:3000/api/stories
```

**Create a Case:**
```bash
curl -X POST http://localhost:3000/api/cases \
  -H "Content-Type: application/json" \
  -d '{"storyIndex": 0, "difficulty": "medium"}'
```

## API Documentation

See [API_DESIGN.md](./API_DESIGN.md) for complete API documentation.

## Unity Integration

For Unity integration, see `unity/USER_GUIDE.md` for complete examples.

The `TruthSeekerViewModel.cs` class provides a high-level interface that handles all HTTP requests and JSON parsing automatically.

## Architecture Notes

- **Session Management**: Currently uses in-memory storage. For production, consider Redis.
- **CORS**: Enabled for all origins (development). Restrict in production.
- **Error Handling**: All endpoints return consistent error format.
- **State Management**: Each game session maintains its own state.

## Production Considerations

1. **Database**: Store sessions in Redis or database
2. **Authentication**: Add user authentication
3. **Rate Limiting**: Prevent API abuse
4. **Caching**: Cache story pools
5. **Logging**: Add proper logging
6. **Monitoring**: Add health checks and metrics
7. **HTTPS**: Use HTTPS in production
8. **Environment Variables**: Use .env for configuration
