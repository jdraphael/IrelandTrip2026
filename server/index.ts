import 'dotenv/config';
import path from 'node:path';
import express from 'express';
import { createApp } from './app.js';
import { createRuntimeDatabase } from './databaseFactory.js';

const port = Number(process.env.PORT || 4317);
const db = createRuntimeDatabase({ isVercel: false });
const app = createApp({ db });
const distPath = path.resolve(process.cwd(), 'dist');

app.use(express.static(distPath));
app.get(/^(?!\/api).*/, (_request, response) => {
  response.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, '127.0.0.1', () => {
  console.log(`Ireland Trip Agent API running at http://127.0.0.1:${port}`);
});
