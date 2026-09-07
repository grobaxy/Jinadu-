import { apiApp } from '../server/apiApp';

// Vercel Serverless Function Entry Point
export default function handler(req: any, res: any) {
  return apiApp(req, res);
}

export { apiApp as app };
