const app = require('./app');

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, () => {
  console.log(`🌿 AgroConnect API escuchando en http://localhost:${PORT}`);
  console.log(`📚 Documentación Swagger en http://localhost:${PORT}/api/docs`);
});
