import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', server: process.env.IMAP_HOST });
});

// Routes
import authRoutes from './routes/auth';
import mailRoutes from './routes/mail';

app.use('/api/auth', authRoutes);
app.use('/api/mail', mailRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Mail API running on port ${PORT}`);
});
