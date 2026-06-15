// Declaración mínima para que TypeScript acepte el import dinámico de Leaflet
// sin necesitar @types/leaflet en tiempo de compilación.
// Cuando el usuario ejecuta `npm install`, los tipos reales de @types/leaflet
// reemplazan esta declaración automáticamente (tienen mayor precedencia).
declare module 'leaflet';
