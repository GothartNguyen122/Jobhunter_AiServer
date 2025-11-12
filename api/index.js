// Vercel serverless function wrapper for Express app
// This file is used when deploying to Vercel
// For local development, use server.js instead

const App = require('../app');

// Create app instance
const appInstance = new App();
const app = appInstance.getApp();

// Export app for Vercel serverless function
// Vercel will automatically handle the Express app
module.exports = app;

