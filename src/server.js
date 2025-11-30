import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
const app = express();
import userRoutes from './routes/userRoutes.js';
import jobRoutes from './routes/jobRoutes.js'
import companyRoutes from './routes/companyRoutes.js'
import applicationRoutes from './routes/applicationRoutes.js'
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/dbConfig.js';
import cookieParser from 'cookie-parser';
import errorHandler from './utils/errorHandler.js';
import { sanitizeRequest } from './middlewares/sanitizeMiddleware.js';

const PORT = process.env.PORT || 6000;

app.use(helmet());

app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300
});
app.use(globalLimiter);

app.use(sanitizeRequest);

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK' });
});


app.use('/api/users', userRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);


app.use((req, res, next) => {
  res.status(404).json({ message: "Not found" });
});


app.use(errorHandler);



connectDB(process.env.MONGO_URI).then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}).catch((err) => {
    console.log("Failed to connect to database", err);
});
