import 'dotenv/config'; // Load environment variables first
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Sequelize, DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, Op } from 'sequelize';

// --- CONFIGURATION ---
const PORT = 3006;
const DB_DIALECT = (process.env.DB_DIALECT as 'mysql' | 'sqlite') || 'sqlite';
const DB_STORAGE = process.env.DB_STORAGE || 'database.sqlite';
const DB_NAME = process.env.DB_NAME || 'flowstate';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASS || '12345678';
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'flowstate_secret_key_change_me';

const app = express();

// Log every incoming request
app.use((req, res, next) => {
    console.log(`[INCOMING] ${req.method} ${req.url} from ${req.ip}`);
    next();
});

app.use(cors({
    origin: true, // Allow all origins for dev, or specify the frontend URL
    credentials: true // Allow cookies
}));
app.use(express.json() as any);
app.use(cookieParser());

// --- DATABASE CONNECTION ---
let sequelize: Sequelize;

console.log(`Initializing Database...`);
if (DB_DIALECT === 'mysql') {
    sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
        host: DB_HOST,
        port: DB_PORT,
        dialect: 'mysql',
        logging: false,
        pool: { max: 5, min: 0, acquire: 60000, idle: 20000 },
        dialectOptions: { connectTimeout: 60000 },
    });
} else {
    sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: DB_STORAGE,
        logging: false
    });
}

// --- MODELS ---

class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
    declare id: CreationOptional<string>;
    declare username: string;
    declare passwordHash: string;
}

(User as any).init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING, allowNull: false }
}, { sequelize, modelName: 'User' });

class Category extends Model<InferAttributes<Category>, InferCreationAttributes<Category>> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare type: 'focus' | 'meeting' | 'break' | 'other';
}

(Category as any).init({
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
  declare date: string; // YYYY-MM-DD
  declare startTime: string;
  declare endTime: string;
  declare durationMinutes: number;
  declare type: string;
  declare categoryId: CreationOptional<string | null>;
  declare description: CreationOptional<string>;
  declare isPlanned: CreationOptional<boolean>;
}

(TimeBlock as any).init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: { type: DataTypes.STRING, allowNull: false },
  app: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Manual' },
  date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  startTime: { type: DataTypes.STRING, allowNull: false },
  endTime: { type: DataTypes.STRING, allowNull: false },
  durationMinutes: { type: DataTypes.INTEGER, allowNull: false },
  type: { type: DataTypes.STRING, allowNull: false },
  categoryId: { type: DataTypes.STRING, allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  isPlanned: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  sequelize,
  modelName: 'TimeBlock',
});

// --- MIDDLEWARE ---
const verifyToken = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ error: 'Access denied. Please login.' });
    }
    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ error: 'Invalid token' });
    }
};

// --- HELPER ---
const getTodayStr = () => new Date().toISOString().split('T')[0];

// --- SEEDER ---
const seedData = async () => {
  try {
    // 1. Seed Default User
    const userCount = await (User as any).count();
    if (userCount === 0) {
        console.log('Creating Admin User...');
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('password123', salt);
        await (User as any).create({
            username: 'admin',
            passwordHash: hash
        });
        console.log('Admin user created: admin / password123');
    }

    // 2. Seed Data
    const catCount = await (Category as any).count();
    if (catCount === 0) {
      console.log('Seeding Database Categories...');
      const today = getTodayStr();

      // Create Categories
      await (Category as any).bulkCreate([
        { id: 'cat_1', name: 'Development', type: 'focus' },
        { id: 'cat_2', name: 'Collaboration', type: 'meeting' },
        { id: 'cat_4', name: 'Breaks', type: 'break' },
        { id: 'cat_5', name: 'Admin', type: 'other' },
      ]);

      // Create Planned Blocks
      await (TimeBlock as any).bulkCreate([
        {
          title: 'Morning Deep Work',
          app: 'VS Code',
          date: today,
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
          date: today,
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
          date: today,
          startTime: '12:00',
          endTime: '13:00',
          durationMinutes: 60,
          type: 'break',
          categoryId: 'cat_4',
          isPlanned: true
        }
      ]);

      // Create Actual Blocks
      await (TimeBlock as any).bulkCreate([
        {
          title: 'Deep Work: Backend API',
          app: 'VS Code',
          date: today,
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
          date: today,
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
  } catch (err) {
    console.error("Seeding error:", err);
  }
};

// --- ROUTES ---

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: DB_DIALECT });
});

// Auth Routes
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await (User as any).findOne({ where: { username } });
        if (!user) return res.status(400).json({ error: 'User not found' });

        const validPass = await bcrypt.compare(password, user.passwordHash);
        if (!validPass) return res.status(400).json({ error: 'Invalid password' });

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
        
        // IMPORTANT: httpOnly prevents XSS stealing the token
        res.cookie('token', token, { 
            httpOnly: true, 
            secure: false, // Set to true in production with HTTPS
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        } as any);

        res.json({ success: true, user: { id: user.id, username: user.username } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
});

app.get('/api/auth/me', verifyToken, async (req, res) => {
    try {
        const user = await (User as any).findByPk((req as any).user.id, {
            attributes: ['id', 'username']
        });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin / Test Routes (Protected)
app.post('/api/reset', verifyToken, async (req, res) => {
    try {
        await (TimeBlock as any).destroy({ where: {}, truncate: true });
        await (Category as any).destroy({ where: {}, truncate: true });
        res.json({ success: true, message: 'Database reset complete.' });
    } catch (err) {
        console.error('Reset failed:', err);
        res.status(500).json({ error: 'Failed to reset database' });
    }
});

app.post('/api/seed', verifyToken, async (req, res) => {
    try {
        await seedData();
        res.json({ success: true, message: 'Database seeded (if empty).' });
    } catch (err) {
        console.error('Seed failed:', err);
        res.status(500).json({ error: 'Failed to seed database' });
    }
});

// Categories
app.get('/api/categories', verifyToken, async (req, res) => {
  try {
    const categories = await (Category as any).findAll();
    res.json(categories);
  } catch (err) {
    console.error("GET /categories error:", err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.post('/api/categories', verifyToken, async (req, res) => {
  try {
    const { name, type } = req.body;
    const category = await (Category as any).create({ name, type });
    res.json(category);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create category' });
  }
});

app.delete('/api/categories/:id', verifyToken, async (req, res) => {
  try {
    await (Category as any).destroy({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Time Blocks
app.get('/api/blocks', verifyToken, async (req, res) => {
  try {
    const { type, date } = req.query; // 'planned' or 'actual', 'YYYY-MM-DD'
    const isPlanned = type === 'planned';
    const whereClause: any = { isPlanned };
    
    if (date) {
        whereClause.date = date;
    }

    const blocks = await (TimeBlock as any).findAll({
      where: whereClause,
      order: [['startTime', 'ASC']]
    });
    res.json(blocks);
  } catch (err) {
    console.error("GET /blocks error:", err);
    res.status(500).json({ error: 'Failed to fetch blocks' });
  }
});

app.post('/api/blocks', verifyToken, async (req, res) => {
  try {
    const { date, ...rest } = req.body;
    const blockDate = date || getTodayStr();
    
    console.log(`[API] Creating Block: ${rest.title} (${rest.durationMinutes}m) on ${blockDate}`);
    const block = await (TimeBlock as any).create({ ...rest, date: blockDate });
    res.json(block);
  } catch (err) {
    console.error("[API] Failed to create block:", err);
    res.status(400).json({ error: 'Failed to create block' });
  }
});

app.put('/api/blocks/:id', verifyToken, async (req, res) => {
    try {
        await (TimeBlock as any).update(req.body, { where: { id: req.params.id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update block'});
    }
});

app.delete('/api/blocks/:id', verifyToken, async (req, res) => {
    try {
        await (TimeBlock as any).destroy({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete block'});
    }
});

// History Endpoint for Trends
app.get('/api/history', verifyToken, async (req, res) => {
    try {
        const blocks = await (TimeBlock as any).findAll({
            where: { 
                isPlanned: false, 
                type: 'focus' 
            },
            attributes: [
                'date',
                [sequelize.fn('SUM', sequelize.col('durationMinutes')), 'totalMinutes']
            ],
            group: ['date'],
            raw: true
        });
        res.json(blocks);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// --- INIT ---
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log(`Database connected (${DB_DIALECT}) on ${DB_HOST}:${DB_PORT}`);
    
    try {
        await sequelize.sync({ alter: true }); 
    } catch (syncError) {
        console.warn("Sync with { alter: true } failed. Falling back to simple sync.");
        console.error(syncError);
        await sequelize.sync(); 
    }

    await seedData();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('DATABASE CONNECTION FAILED', error);
  }
};

startServer();