import express from 'express';
import userRoutes from './routes/userRoutes';
import authRoutes from './routes/authRoutes';

const app = express();

app.use(express.json());

app.use('/users', userRoutes);
app.use('/auth', authRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
