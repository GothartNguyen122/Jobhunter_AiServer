const client = require('prom-client');

// Tạo một Registry mới cho metrics
const register = new client.Registry();

// Thêm default metrics (CPU, memory, event loop, etc.)
client.collectDefaultMetrics({
  register,
  prefix: 'jobhunter_ai_',
});

// Tạo custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'jobhunter_ai_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  register,
});

const httpRequestTotal = new client.Counter({
  name: 'jobhunter_ai_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  register,
});

const httpRequestErrors = new client.Counter({
  name: 'jobhunter_ai_http_errors_total',
  help: 'Total number of HTTP errors',
  labelNames: ['method', 'route', 'status_code'],
  register,
});

const activeConnections = new client.Gauge({
  name: 'jobhunter_ai_active_connections',
  help: 'Number of active connections',
  register,
});

const chatMessagesTotal = new client.Counter({
  name: 'jobhunter_ai_chat_messages_total',
  help: 'Total number of chat messages processed',
  labelNames: ['chatbox_id', 'status'],
  register,
});

const pdfExtractionsTotal = new client.Counter({
  name: 'jobhunter_ai_pdf_extractions_total',
  help: 'Total number of PDF extractions',
  labelNames: ['status'],
  register,
});

const pdfExtractionDuration = new client.Histogram({
  name: 'jobhunter_ai_pdf_extraction_duration_seconds',
  help: 'Duration of PDF extraction in seconds',
  labelNames: ['status'],
  buckets: [1, 2, 5, 10, 20, 30, 60],
  register,
});

const openaiApiCallsTotal = new client.Counter({
  name: 'jobhunter_ai_openai_api_calls_total',
  help: 'Total number of OpenAI API calls',
  labelNames: ['model', 'status'],
  register,
});

const openaiApiDuration = new client.Histogram({
  name: 'jobhunter_ai_openai_api_duration_seconds',
  help: 'Duration of OpenAI API calls in seconds',
  labelNames: ['model', 'status'],
  buckets: [0.5, 1, 2, 5, 10, 20, 30],
  register,
});

const databaseQueryDuration = new client.Histogram({
  name: 'jobhunter_ai_database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  register,
});

// Middleware để đo thời gian request
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  const route = req.route ? req.route.path : req.path;

  // Tăng số lượng active connections
  activeConnections.inc();

  // Ghi lại khi response kết thúc
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const statusCode = res.statusCode;
    const method = req.method;

    // Ghi metrics
    httpRequestDuration.observe(
      { method, route, status_code: statusCode },
      duration
    );
    httpRequestTotal.inc({ method, route, status_code: statusCode });

    // Ghi lỗi nếu có
    if (statusCode >= 400) {
      httpRequestErrors.inc({ method, route, status_code: statusCode });
    }

    // Giảm số lượng active connections
    activeConnections.dec();
  });

  next();
};

module.exports = {
  register,
  httpRequestDuration,
  httpRequestTotal,
  httpRequestErrors,
  activeConnections,
  chatMessagesTotal,
  pdfExtractionsTotal,
  pdfExtractionDuration,
  openaiApiCallsTotal,
  openaiApiDuration,
  databaseQueryDuration,
  metricsMiddleware,
};
