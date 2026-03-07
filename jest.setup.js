// Suprimir warnings de conexão ao Redis após os testes
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args) => {
  const message = args?.[0]?.toString?.() || '';
  
  // Silenciar errors de Redis/BullMQ
  if (
    message.includes('ECONNREFUSED') ||
    message.includes('AggregateError') ||
    message.includes('Cannot log after tests') ||
    message.includes('Redis') ||
    message.includes('BullMQ') ||
    message.includes('6379')
  ) {
    return;
  }
  
  originalError.call(console, ...args);
};

console.warn = (...args) => {
  const message = args?.[0]?.toString?.() || '';
  
  // Silenciar warnings de Redis/BullMQ
  if (
    message.includes('ECONNREFUSED') ||
    message.includes('AggregateError') ||
    message.includes('Redis') ||
    message.includes('BullMQ') ||
    message.includes('6379')
  ) {
    return;
  }
  
  originalWarn.call(console, ...args);
};

// Estender timeout para evitar race conditions
jest.setTimeout(30000);


