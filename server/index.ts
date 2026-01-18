import express from 'express';
import cors from 'cors';
import { Sequelize, DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';

// --- CONFIGURATION ---
const PORT = 3006;
const DB_DIALECT = (process.env.DB_DIALECT as 'mysql' | 'sqlite') || 'sqlite';
const DB_STORAGE = process.env.DB_STORAGE || 'database.sqlite';
const DB_NAME = process.env.DB_NAME || 'flowstate';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASS || '12345678';
const DB_HOST = process.env.DB_HOST || 'localhost';

const app = express();
app.use(cors());
// Fix: Cast express.json() to any to avoid type mismatch with app.use
app.use(express.json() as any);

// --- DATABASE CONNECTION ---
// Fallback to SQLite if no specific MySQL env vars are present to ensure the app runs out of the box.
let sequelize: Sequelize;

if (DB_DIALECT === 'mysql') {
    sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
        host: DB_HOST,
        dialect: 'mysql',
        logging: false,
    });
} else {
    sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: DB_STORAGE,
        logging: false
    });
}

// --- MODELS ---

class Category extends Model<InferAttributes<Category>, InferCreationAttributes<Category>> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare type: string;
}

Category.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  type: {
    type: DataTypes.ENUM('focus', 'meeting', 'break', 'other'),
    allowNull: false,
  },
}, {
  sequelize,
  modelName: 'Category',
});

class TimeBlock extends Model<InferAttributes<TimeBlock>, InferCreationAttributes<TimeBlock>> {
  declare id: CreationOptional<string>;
  declare title: string;
  declare app: CreationOptional<string>;
  declare startTime: string;
  declare endTime: string;
  declare durationMinutes: number;
  declare type: string;
  declare categoryId: CreationOptional<string | null>;
  declare description: CreationOptional<string>;
  declare isPlanned: CreationOptional<boolean>;
}

TimeBlock.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: { type: DataTypes.STRING, allowNull: false },
  app: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Manual' },
  startTime: { type: DataTypes.STRING, allowNull: false },
  endTime: { type: DataTypes.STRING, allowNull: false },
  durationMinutes: { type: DataTypes.INTEGER, allowNull: false },
  type: { type: DataTypes.STRING, allowNull: false },
  categoryId: { type: DataTypes.STRING, allowNull: true }, // Loose coupling for now
  description: { type: DataTypes.TEXT, allowNull: true },
  isPlanned: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  sequelize,
  modelName: 'TimeBlock',
});

// --- SEEDER ---
const seedData = async () => {
  const catCount = await Category.count();
  if (catCount === 0) {
    console.log('Seeding Database...');
    
    // Create Categories
    await Category.bulkCreate([
      { id: 'cat_1', name: 'Development', type: 'focus' },
      { id: 'cat_2', name: 'Collaboration', type: 'meeting' },
      { id: 'cat_4', name: 'Breaks', type: 'break' },
      { id: 'cat_5', name: 'Admin', type: 'other' },
    ]);

    // Create Planned Blocks
    await TimeBlock.bulkCreate([
      {
        title: 'Morning Deep Work',
        app: 'VS Code',
        startTime: '09:00',
        endTime: '11:00',
        durationMinutes: 120,
        type: 'focus',
        categoryId: 'cat_1',
        description: 'Planned: Auth Middleware',
        isPlanned: true
      },
      {
        title: 'Team Standup',
        app: 'Zoom',
        startTime: '11:00',
        endTime: '11:30',
        durationMinutes: 30,
        type: 'meeting',
        categoryId: 'cat_2',
        isPlanned: true
      },
      {
        title: 'Lunch',
        app: 'Offline',
        startTime: '12:00',
        endTime: '13:00',
        durationMinutes: 60,
        type: 'break',
        categoryId: 'cat_4',
        isPlanned: true
      }
    ]);

    // Create Actual Blocks
    await TimeBlock.bulkCreate([
      {
        title: 'Deep Work: Backend API',
        app: 'VS Code',
        startTime: '09:15',
        endTime: '11:00',
        durationMinutes: 105,
        type: 'focus',
        categoryId: 'cat_1',
        isPlanned: false
      },
      {
        title: 'Daily Standup',
        app: 'Zoom',
        startTime: '11:00',
        endTime: '11:35',
        durationMinutes: 35,
        type: 'meeting',
        categoryId: 'cat_2',
        isPlanned: false
      }
    ]);
    console.log('Seeding Complete.');
  } else {
      console.log('Database already has data. Skipping seed.');
  }
};

// --- ROUTES ---

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: DB_DIALECT });
});

// Admin / Test Routes
app.post('/api/reset', async (req, res) => {
    try {
        await TimeBlock.destroy({ where: {}, truncate: true });
        await Category.destroy({ where: {}, truncate: true });
        res.json({ success: true, message: 'Database reset complete.' });
    } catch (err) {
        console.error('Reset failed:', err);
        res.status(500).json({ error: 'Failed to reset database' });
    }
});

app.post('/api/seed', async (req, res) => {
    try {
        await seedData();
        res.json({ success: true, message: 'Database seeded (if empty).' });
    } catch (err) {
        console.error('Seed failed:', err);
        res.status(500).json({ error: 'Failed to seed database' });
    }
});

// Categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await Category.findAll();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const { name, type } = req.body;
    const category = await Category.create({ name, type });
    res.json(category);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create category' });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    await Category.destroy({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Time Blocks
app.get('/api/blocks', async (req, res) => {
  try {
    const { type } = req.query; // 'planned' or 'actual'
    const isPlanned = type === 'planned';
    
    const blocks = await TimeBlock.findAll({
      where: { isPlanned },
      order: [['startTime', 'ASC']]
    });
    res.json(blocks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch blocks' });
  }
});

app.post('/api/blocks', async (req, res) => {
  try {
    const block = await TimeBlock.create(req.body);
    res.json(block);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create block' });
  }
});

app.put('/api/blocks/:id', async (req, res) => {
    try {
        await TimeBlock.update(req.body, { where: { id: req.params.id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update block'});
    }
});

app.delete('/api/blocks/:id', async (req, res) => {
    try {
        await TimeBlock.destroy({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete block'});
    }
});

// --- INIT ---
const startServer = async () => {
  try {
    // Attempt to connect to DB
    await sequelize.authenticate();
    console.log(`Database connected (${DB_DIALECT}).`);
    await sequelize.sync(); 
    await seedData();
    
    // Bind to 0.0.0.0 for better container compatibility
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
  }
};

startServer();