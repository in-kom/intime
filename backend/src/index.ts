import 'express-async-errors';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';

import { authRouter } from './routes/auth.routes';
import { companyRouter } from './routes/company.routes';
import { projectRouter } from './routes/project.routes';
import { taskRouter } from './routes/task.routes';
import { tagRouter } from './routes/tag.routes';
import { projectDetailRouter } from './routes/project-detail.routes';
import { errorHandler } from './middleware/error.middleware';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/companies', companyRouter);
app.use('/api/projects', projectRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/tags', tagRouter);
app.use('/api/project-details', projectDetailRouter);

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
