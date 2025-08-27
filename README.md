# Intime ⏱️

![GitHub repo size](https://img.shields.io/github/repo-size/in-kom/intime) ![GitHub language count](https://img.shields.io/github/languages/count/in-kom/intime) ![GitHub top language](https://img.shields.io/github/languages/top/in-kom/intime) ![GitHub last commit](https://img.shields.io/github/last-commit/in-kom/intime?color=red)

Intime is a **self-hosted** project management platform that provides an **intuitive and efficient environment** for organizing tasks and tracking project progress. ⚡ It allows teams to **collaborate, prioritize, and visualize** their work in real time, making project management more streamlined for individuals and organizations of all sizes.

## 🔑 Key Features

- 📊 **Project Insights Dashboard** with real-time analytics
- 🔄 **Interactive Kanban Board** for visual task management
- 📅 **Calendar View** for deadline tracking and scheduling
- 📚 **Database View** for comprehensive project information
- 🔗 **Project Links Management** for important resources
- 🏢 **Multi-Company Support** for organization management

<!-- Replace with an actual screenshot of your app -->
<!-- ![Intime Dashboard](demo.png) -->

## 🚀 Installation

> [!TIP]
> For the best experience, we recommend running both the frontend and backend services.

### Prerequisites 🛠️
Ensure you have the following installed:
- **Node.js** v19.0.0 or higher
- **npm** v10.0.0 or higher
- **PostgreSQL** v14 or higher

### Install from Source 🏗️

1. Clone the repository:
   ```bash
   git clone https://github.com/in-kom/intime.git
   cd intime
   ```

2. Set up the backend:
   ```bash
   cd src/backend
   npm install
   
   # Configure your database
   cp .env.example .env
   # Edit .env with your PostgreSQL credentials
   
   # Run database migrations
   npm run prisma:migrate
   
   # Start the backend server
   npm run dev
   ```

3. Set up the frontend:
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

4. Access the application at `http://localhost:5173`.

> [!NOTE]
> For production deployment, use `npm run build` and `npm run start` instead of `npm run dev`.

## 📱 Features

### Company Management
Organize your work by companies, each with its own set of projects and team members. Add company logos and details for better identification.

### Project Management
Create and manage projects with detailed information:
- Customizable project details and descriptions
- Project insights with performance metrics
- Links management for important resources

### Task Management
Manage tasks efficiently with multiple views:
- **Kanban Board**: Drag-and-drop interface with customizable columns
- **Calendar View**: Timeline-based task visualization
- **Database View**: Comprehensive listing of all tasks

### Real-time Analytics
Track project progress with visual insights:
- Completion rates
- Task status distribution
- Priority breakdown
- Overdue task tracking

## 🛠️ How to Use

### Creating a Company
1. Click on "Create Company" from the dashboard
2. Enter company name and optional description
3. Upload a company logo (optional)

### Creating Projects
1. Select a company from the sidebar
2. Click "New Project" button
3. Enter project name and description
4. Your project is now ready for tasks

### Managing Tasks
1. Navigate to the Kanban view of your project
2. Add tasks using the "+" button in any column
3. Drag and drop tasks between columns to update status
4. Click on a task to edit details, set priorities, or add descriptions

## 📚 Documentation
For more detailed information, refer to the project documentation:
- [User Guide](./docs/user-guide.md)
- [API Documentation](./docs/api.md)
- [Development Guide](./docs/development.md)

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 💬 Support

For questions and support, please open an issue in the [Issue Section](https://github.com/in-kom/intime/issues).

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## ✍️ Authors & Acknowledgments

Developed with ❤️ by Inkom.

**Happy organizing with Intime!** 🎉
