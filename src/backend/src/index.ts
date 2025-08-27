import 'express-async-errors';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import http from 'http';
import { initWebSocketServer } from './services/websocket.service';

import { authRouter } from './routes/auth.routes';
import { companyRouter } from './routes/company.routes';
import { projectRouter } from './routes/project.routes';
import { taskRouter } from './routes/task.routes';
import { tagRouter } from './routes/tag.routes';
import { projectDetailRouter } from './routes/project-detail.routes';
import { errorHandler } from './middleware/error.middleware';
import { userRouter } from './routes/user.routes';
import commentRoutes from './routes/comment.routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
initWebSocketServer(server);

// Middleware
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// Serve static files from uploads directory
app.use('/api/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/companies', companyRouter);
app.use('/api/projects', projectRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/tags', tagRouter);
app.use('/api/project-details', projectDetailRouter);
app.use('/api/users', userRouter);
app.use('/api', commentRoutes);

// Error handler
app.use(errorHandler);

// Start server using the HTTP server instead of app.listen
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} with WebSocket support`);
});

export { app };