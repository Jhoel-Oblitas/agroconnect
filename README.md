# 🌿 AgroConnect — CRM-Agro Modular (Del campo a la nube)

Plataforma web **PWA (Progressive Web App)** responsiva y modular diseñada para una finca pequeña (frutas, hortalizas y vivero), con arquitectura **Vue 3 + Node.js/Express + Prisma/SQLite + Leaflet + Chart.js + QR + Agente IA vía WhatsApp**.

## Módulos Implementados (M0 – M7)
- **M0 · Núcleo:** Gestión de finca, usuarios con roles (`PROPIETARIO`, `ENCARGADO`, `TRABAJADOR`), lotes con polígonos/suelo NPK, cultivos, campañas y **activación modular dinámica por finca**.
- **M1 · Control Técnico de Campo:** Labores, riego, aplicaciones fitosanitarias con cálculo y **bloqueo automático de período de carencia**, y registro de cosechas.
- **M2 · Trazabilidad QR:** Códigos QR descargables por lote de cosecha y ficha pública (`/trazabilidad/:codigo`) consultable por el cliente sin iniciar sesión (`Lote → Labores → Fitosanitario → Cosecha → Venta`).
- **M3 · Trabajadores:** Personal, control de asistencia, tareas asignadas, jornales y registro de pagos.
- **M4 · Inventarios:** Semillas, fertilizantes, agroquímicos (con dosis oficial de etiqueta), herramientas y productos cosechados, con entradas/salidas y **alertas de stock mínimo**.
- **M5 · Ventas y Clientes:** Clientes (con consentimiento WhatsApp), ventas vinculadas a lotes QR, cuentas por cobrar y cobro de abonos.
- **M6 · Vivero:** Producción de plantines, porcentaje de germinación y stock disponible.
- **M7 · Reportes y Finanzas:** Costos por lote (jornales + insumos), ingresos, margen neto y gráficos `Chart.js`.
- **Agente de IA + WhatsApp:** Simulador integrado + webhooks reales para **Meta WhatsApp Cloud API** y **Twilio Sandbox**, compatible con **Groq** y **Anthropic Claude** (con motor NLP local de respaldo). Incluye **confirmación previa obligatoria (`SÍ`/`NO`)** y **límites agronómicos estrictos** (nunca inventa dosis de agroquímicos ni reemplaza al ingeniero agrónomo).

## Documentación API (Swagger)
- Disponible en `/api/docs` cuando el backend está corriendo.

## Estimación de Costo Mensual de Operación en la Nube
| Servicio | Proveedor | Plan Inicial (Bajo Costo) | Plan Escala Finca Real |
| --- | --- | --- | --- |
| Frontend PWA | Vercel | $0 / mes (Hobby) | $0 – $20 / mes |
| Backend + SQLite | Render / Railway | $0 / mes (Free) | $7 / mes (Starter con disco persistente) |
| Agente IA (LLM) | Groq API (Llama 3.3) | $0 / mes (Free Tier) | ~$2 – $5 / mes |
| WhatsApp | Meta Cloud API / Twilio | $0 / mes (1.000 conv. servicio gratis) | ~$5 / mes |
| **Total estimado** | | **$0 / mes** | **~$14 – $17 / mes** |
