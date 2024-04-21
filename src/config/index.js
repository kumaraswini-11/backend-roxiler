// Configuration object for the application (centralizing your configuration in one place)
export const config = {
  port: String(process.env.PORT),
  corsOrigin: String(process.env.CORS_ORIGIN),
  mongoDBUri: String(process.env.MONGODB_URI),
};
