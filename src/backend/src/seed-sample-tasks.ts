import { parse } from 'date-fns';
import { Client } from 'pg';

const parseDate = (dateStr: string) => parse(dateStr, 'dd/MM/yyyy', new Date());
const refDate = parseDate('01/06/2025');

const getStatus = (start?: Date, end?: Date): string => {
  if (end && end < refDate) return 'DONE';
  if (start && !end && start < refDate) return 'IN_PROGRESS';
  return 'TODO';
};

const getPriority = (title: string): string => {
  const titleLower = title.toLowerCase();
  if (titleLower.includes('final pitch') || titleLower.includes('deployment')) return 'URGENT';
  if (titleLower.includes('api') || titleLower.includes('recommendation')) return 'HIGH';
  return 'MEDIUM';
};

interface TaskDef {
  title: string;
  startDate?: Date;
  dueDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  children?: TaskDef[];
}

const taskTree: TaskDef[] = [
  {
    title: 'Planning', startDate: parseDate('23/04/2025'), dueDate: parseDate('20/06/2025'), actualStartDate: parseDate('22/04/2025'), actualEndDate: parseDate('20/06/2025'),
    children: [
      { title: 'Project Analysis', startDate: parseDate('23/04/2025'), dueDate: parseDate('23/04/2025'), actualStartDate: parseDate('22/04/2025'), actualEndDate: parseDate('23/04/2025') },
      { title: 'Project Charter', startDate: parseDate('23/04/2025'), dueDate: parseDate('23/04/2025'), actualStartDate: parseDate('23/04/2025'), actualEndDate: parseDate('23/04/2025') },
      { title: 'Task Definition', startDate: parseDate('23/04/2025'), dueDate: parseDate('24/04/2025'), actualStartDate: parseDate('23/04/2025'), actualEndDate: parseDate('23/04/2025') },
      { title: 'Schedule Creation', startDate: parseDate('24/04/2025'), dueDate: parseDate('24/04/2025'), actualStartDate: parseDate('24/04/2025'), actualEndDate: parseDate('24/04/2025') },
      { title: 'Post-Mortem', startDate: parseDate('20/06/2025'), dueDate: parseDate('20/06/2025'), actualStartDate: parseDate('20/06/2025'), actualEndDate: parseDate('20/06/2025') },
      { title: 'README', startDate: parseDate('15/05/2025'), dueDate: parseDate('15/05/2025'), actualStartDate: parseDate('21/05/2025'), actualEndDate: parseDate('21/05/2025') },
      { title: 'KPIs', startDate: parseDate('25/04/2025'), dueDate: parseDate('25/04/2025'), actualStartDate: parseDate('25/04/2025'), actualEndDate: parseDate('25/04/2025') },
      { title: 'Risk anticipation and management', startDate: parseDate('25/04/2025'), dueDate: parseDate('25/04/2025'), actualStartDate: parseDate('25/04/2025'), actualEndDate: parseDate('25/04/2025') },
    ]
  },
  {
    title: 'Documents', startDate: parseDate('23/04/2025'), dueDate: parseDate('06/06/2025'), actualStartDate: parseDate('23/04/2025'), actualEndDate: parseDate('06/06/2025'),
    children: [
      { title: 'Functional Specifications', startDate: parseDate('23/04/2025'), dueDate: parseDate('16/05/2025'), actualStartDate: parseDate('23/04/2025'), actualEndDate: parseDate('16/05/2025') },
      { title: 'Technical Specifications', startDate: parseDate('14/05/2025'), dueDate: parseDate('28/05/2025'), actualStartDate: parseDate('14/05/2025'), actualEndDate: parseDate('28/05/2025') },
      { title: 'Test Plan', startDate: parseDate('14/05/2025'), dueDate: parseDate('06/06/2025'), actualStartDate: parseDate('14/05/2025'), actualEndDate: parseDate('06/06/2025') }
    ]
  },
  {
    title: 'Design', startDate: parseDate('23/04/2025'), dueDate: parseDate('14/05/2025'), actualStartDate: parseDate('23/04/2025'), actualEndDate: parseDate('14/05/2025'),
    children: [
      { title: 'Graphical charter', startDate: parseDate('23/04/2025'), dueDate: parseDate('28/04/2025'), actualStartDate: parseDate('23/04/2025'), actualEndDate: parseDate('28/04/2025') },
      { title: 'Wireframes', startDate: parseDate('25/04/2025'), dueDate: parseDate('30/04/2025'), actualStartDate: parseDate('25/04/2025'), actualEndDate: parseDate('30/04/2025') },
      { title: 'User journey roadmap creation', startDate: parseDate('25/04/2025'), dueDate: parseDate('28/04/2025'), actualStartDate: parseDate('25/04/2025'), actualEndDate: parseDate('28/04/2025') },
      { title: 'Pages mock-ups', startDate: parseDate('01/05/2025'), dueDate: parseDate('14/05/2025'), actualStartDate: parseDate('01/05/2025'), actualEndDate: parseDate('14/05/2025') },
    ]
  },
  {
    title: 'Frontend Development', startDate: parseDate('14/05/2025'), dueDate: parseDate('05/06/2025'), actualStartDate: parseDate('14/05/2025'), actualEndDate: parseDate('05/06/2025'),
    children: [
      { title: 'Splash Screen', startDate: parseDate('14/05/2025'), dueDate: parseDate('14/05/2025'), actualStartDate: parseDate('14/05/2025'), actualEndDate: parseDate('14/05/2025') },
      { title: 'Home Page', startDate: parseDate('15/05/2025'), dueDate: parseDate('19/05/2025'), actualStartDate: parseDate('15/05/2025'), actualEndDate: parseDate('19/05/2025') },
      { title: 'Search Tag Selection Popup', startDate: parseDate('20/05/2025'), dueDate: parseDate('21/05/2025'), actualStartDate: parseDate('20/05/2025'), actualEndDate: parseDate('21/05/2025') },
      { title: 'Result Page - Not found', startDate: parseDate('21/05/2025'), dueDate: parseDate('21/05/2025'), actualStartDate: parseDate('21/05/2025'), actualEndDate: parseDate('21/05/2025') },
      { title: 'Result Page - Wines', startDate: parseDate('22/05/2025'), dueDate: parseDate('23/05/2025'), actualStartDate: parseDate('22/05/2025'), actualEndDate: parseDate('23/05/2025') },
      { title: 'Result Page - Cheeses', startDate: parseDate('23/05/2025'), dueDate: parseDate('23/05/2025'), actualStartDate: parseDate('23/05/2025'), actualEndDate: parseDate('23/05/2025') },
      { title: 'Result Page - Dish', startDate: parseDate('26/05/2025'), dueDate: parseDate('28/05/2025'), actualStartDate: parseDate('26/05/2025'), actualEndDate: parseDate('28/05/2025') },
      { title: 'Details Page - Wine', startDate: parseDate('01/06/2025'), dueDate: parseDate('03/06/2025'), actualStartDate: parseDate('01/06/2025'), actualEndDate: parseDate('03/06/2025') },
      { title: 'Details Page - Cheese', startDate: parseDate('03/06/2025'), dueDate: parseDate('05/06/2025'), actualStartDate: parseDate('03/06/2025'), actualEndDate: parseDate('05/06/2025') },
    ]
  },
  {
    title: 'Backend Development (Logic of the Frontend)', startDate: parseDate('05/06/2025'), dueDate: parseDate('16/06/2025'), actualStartDate: parseDate('05/06/2025'), actualEndDate: parseDate('16/06/2025'),
    children: [
      { title: 'Navigation between pages', startDate: parseDate('05/06/2025'), dueDate: parseDate('05/06/2025'), actualStartDate: parseDate('05/06/2025'), actualEndDate: parseDate('05/06/2025') },
      { title: 'Home Page - Most Searched Recommendation', startDate: parseDate('06/06/2025'), dueDate: parseDate('06/06/2025'), actualStartDate: parseDate('06/06/2025'), actualEndDate: parseDate('06/06/2025') },
      { title: 'Localization & Internationalization Support', startDate: parseDate('06/06/2025'), dueDate: parseDate('06/06/2025'), actualStartDate: parseDate('06/06/2025'), actualEndDate: parseDate('06/06/2025') },
      { title: 'Items search algorithm', startDate: parseDate('10/06/2025'), dueDate: parseDate('10/06/2025'), actualStartDate: parseDate('10/06/2025'), actualEndDate: parseDate('10/06/2025') },
      { title: 'Tag-Refined search algorithm', startDate: parseDate('11/06/2025'), dueDate: parseDate('11/06/2025'), actualStartDate: parseDate('11/06/2025'), actualEndDate: parseDate('11/06/2025') },
      { title: 'Wine search results', startDate: parseDate('12/06/2025'), dueDate: parseDate('12/06/2025'), actualStartDate: parseDate('12/06/2025'), actualEndDate: parseDate('12/06/2025') },
      { title: 'Cheese search results', startDate: parseDate('12/06/2025'), dueDate: parseDate('12/06/2025'), actualStartDate: parseDate('12/06/2025'), actualEndDate: parseDate('12/06/2025') },
      { title: 'Dish search results', startDate: parseDate('13/06/2025'), dueDate: parseDate('13/06/2025'), actualStartDate: parseDate('13/06/2025'), actualEndDate: parseDate('13/06/2025') },
      { title: 'Wine details retrieval and display', startDate: parseDate('13/06/2025'), dueDate: parseDate('13/06/2025'), actualStartDate: parseDate('13/06/2025'), actualEndDate: parseDate('13/06/2025') },
      { title: 'Cheese details retrieval and display', startDate: parseDate('14/06/2025'), dueDate: parseDate('14/06/2025'), actualStartDate: parseDate('14/06/2025'), actualEndDate: parseDate('14/06/2025') },
      { title: 'Recommendations algorithm', startDate: parseDate('15/06/2025'), dueDate: parseDate('16/06/2025'), actualStartDate: parseDate('15/06/2025'), actualEndDate: parseDate('16/06/2025') },
    ]
  },
  {
    title: 'Bonus', startDate: parseDate('10/06/2025'), dueDate: parseDate('16/06/2025'),
    children: [
      { title: 'Bar-Code Scanning', startDate: parseDate('10/06/2025'), dueDate: parseDate('16/06/2025') },
      { title: 'ChatGPT Wrapper with tailored recommendation output', startDate: parseDate('10/06/2025'), dueDate: parseDate('16/06/2025') },
      { title: 'Administration Interfaces', startDate: parseDate('10/06/2025'), dueDate: parseDate('16/06/2025') },
    ]
  },
  {
    title: 'Quality Assurance', startDate: parseDate('22/04/2025'), dueDate: parseDate('16/06/2025'), actualStartDate: parseDate('22/04/2025'), actualEndDate: parseDate('16/06/2025'),
    children: [
      { title: 'Project Charter Review', startDate: parseDate('22/04/2025'), dueDate: parseDate('22/04/2025'), actualStartDate: parseDate('22/04/2025'), actualEndDate: parseDate('22/04/2025') },
      { title: 'Github Templates Creation', startDate: parseDate('25/04/2025'), dueDate: parseDate('25/04/2025'), actualStartDate: parseDate('25/04/2025'), actualEndDate: parseDate('25/04/2025') },
      { title: 'Functional Review', startDate: parseDate('05/05/2025'), dueDate: parseDate('16/05/2025'), actualStartDate: parseDate('05/05/2025'), actualEndDate: parseDate('16/05/2025') },
      { title: 'Technical Review', startDate: parseDate('21/05/2025'), dueDate: parseDate('28/05/2025'), actualStartDate: parseDate('21/05/2025'), actualEndDate: parseDate('28/05/2025') },
      { title: 'Code reviewing', startDate: parseDate('28/05/2025'), dueDate: parseDate('16/06/2025'), actualStartDate: parseDate('28/05/2025'), actualEndDate: parseDate('16/06/2025') },
      { title: 'Testing phase', startDate: parseDate('02/06/2025'), dueDate: parseDate('16/06/2025'), actualStartDate: parseDate('02/06/2025'), actualEndDate: parseDate('16/06/2025') },
    ]
  },
  {
    title: 'Closure', startDate: parseDate('10/06/2025'), dueDate: parseDate('20/06/2025'), actualStartDate: parseDate('10/06/2025'), actualEndDate: parseDate('20/06/2025'),
    children: [
      { title: 'Oral presentation preparation', startDate: parseDate('10/06/2025'), dueDate: parseDate('20/06/2025'), actualStartDate: parseDate('10/06/2025'), actualEndDate: parseDate('20/06/2025') },
      { title: 'Final Pitch', startDate: parseDate('20/06/2025'), dueDate: parseDate('20/06/2025'), actualStartDate: parseDate('20/06/2025'), actualEndDate: parseDate('20/06/2025') },
    ]
  },
];

async function seedTasks(projectId: string) {
  const client = new Client({ user: "postgres", password: "postgres", database: "todo_app_db", host: "localhost", port: 5432 });
  await client.connect();

  console.log(`Seeding tasks for project ${projectId}`);

  // Delete all tasks for the project
  await client.query('DELETE FROM "Task" WHERE "projectId" = $1', [projectId]);

  // Recursive insertion
  const insertTask = async (task: TaskDef, parentId?: string) => {
    const res = await client.query(
      `INSERT INTO "Task" 
        (id, title, priority, status, "startDate", "dueDate", "actualStartDate", "actualEndDate", "projectId", "parentId", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING id`,
      [
        task.title,
        getPriority(task.title),
        getStatus(task.actualStartDate, task.actualEndDate),
        task.startDate ? task.startDate.toISOString() : null,
        task.dueDate ? task.dueDate.toISOString() : null,
        task.actualStartDate ? task.actualStartDate.toISOString() : null,
        task.actualEndDate ? task.actualEndDate.toISOString() : null,
        projectId,
        parentId || null,
      ]
    );
    const id = res.rows[0].id;
    if (task.children) {
      for (const sub of task.children) {
        await insertTask(sub, id);
      }
    }
  };

  for (const task of taskTree) {
    await insertTask(task);
  }

  await client.end();
  console.log('Seeding complete.');
}

if (require.main === module) {
  const projectId = process.argv[2];
  if (!projectId) {
    console.error('Please provide a project ID as an argument.');
    process.exit(1);
  }
  seedTasks(projectId)
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}

export { seedTasks };
