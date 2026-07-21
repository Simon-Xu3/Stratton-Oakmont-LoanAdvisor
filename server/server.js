import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import router, { formatRouteError } from './routes.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use('/api', router);

app.use((req, res) => {
  return res.status(404).json({
    data: null,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} was not found.`
    }
  });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const formattedError = formatRouteError(error);
  const message =
    formattedError.statusCode >= 500 && process.env.NODE_ENV === 'production'
      ? 'Unexpected server error.'
      : formattedError.message;

  return res.status(formattedError.statusCode).json({
    data: null,
    error: {
      code: formattedError.code,
      message
    }
  });
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
