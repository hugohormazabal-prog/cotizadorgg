# Auditoría del modelo “Cotizador Residencial.xlsm”

Fecha de revisión: 17 de agosto de 2026.

## Alcance y protección del original

- Libro analizado en modo lectura: `/Users/hh/Downloads/Cotizador Residencial.xlsm`.
- Se inventariaron las 38 hojas visibles, 14.449 celdas con fórmula, 156 nombres, 10 tablas y 25 validaciones.
- El libro original no fue modificado.
- La hoja `PPT` y el documento comercial derivado de la presentación se consideran protegidos. El mantenedor no cambia su diseño ni su contenido.

## Caso patrón de regresión

Caso residencial monofásico, Región Metropolitana, cuenta de $70.000/mes y tarifa de $250/kWh:

| Resultado | Valor auditado |
|---|---:|
| Paneles | 6 × 620 W |
| Capacidad | 3,72 kWp |
| Generación anual | 5.327,04 kWh |
| Autoconsumo anual | 1.680 kWh |
| Inyección anual | 3.647,04 kWh |
| Ahorro año 1 | $878.750 |
| Precio proyecto | $3.919.000 |
| Payback simple | 4,4597 años |
| Crédito ALZA | 300 meses, 3 de gracia |
| Cuota ALZA | $46.223 / 1,150596 UF |

Este caso se usa como prueba dorada del motor web.

## Variables gobernadas por el mantenedor

- Energía: tarifa de consumo, precio de nudo, IVA de inyección, límite de autoconsumo y proyección de consumo.
- Dimensionamiento: panel activo, potencia del panel, mínimo y tope monofásico, inversor activo y potencia mínima.
- Precio: costos netos agregados de materiales y servicios, margen, IVA y regla de redondeo.
- Financiamiento: factores y cuotas de Mercado Pago y Santander; tasa, gracia, plazo, fee, garantías, gastos y UF de ALZA.
- Proyección: IPC, degradación, horizonte, descuento y dos reposiciones.
- Garantías e impacto: paneles, inversor, instalación y factor CO₂.
- Generación: matriz mensual completa de 12 meses × 14 regiones.

Los valores derivados —factor de generación, precio de venta por kWp y cuota ALZA— son de solo lectura para impedir combinaciones incoherentes.

## Cobertura por hoja

| Hoja | Tratamiento en la web |
|---|---|
| MAIN, INPUT | Entradas y reglas directas |
| COT_ONGRID | Resultado residencial derivado |
| PPT | Protegida; no se edita |
| IMAGEN | Activos protegidos |
| COTBACK, CUBICADOR | Reglas consolidadas en costos y dimensionamiento |
| FC Capital Propio, FC MP, FC SANTANDER, FC ALZA | Proyección y financiamiento |
| CREDITOALZA | Fórmula completa de crédito y PMT |
| FINBACK | Generación, autoconsumo, inyección y ahorro |
| GEN Zona | Matriz regional editable completa |
| PAN, INV | Equipos activos y metadatos del resultado |
| EST, TAB, CABLE, CAN, SERV, SERVBACK, COM, CANBACK | Familias consolidadas en el costo residencial |
| COT_GRANEL, COTBACKGRANEL, BATGRANEL, COMPBATGRANEL, CANBACKGRANEL, CABLEGRANEL | Identificadas; fuera del formulario residencial actual |
| COT_OFFGRID, REG | Identificadas; fuera del formulario residencial actual |
| BAT, COMPBAT | Identificadas como catálogos de almacenamiento no usados por el flujo on-grid actual |
| BOMBACALOR, CARGADOREV, AIREAC | Opcionales de referencia, no seleccionados por el formulario actual |
| Precios Competencia | Referencia comercial, no participa en la fórmula |

La pantalla “Cobertura del Excel” presenta individualmente las 38 hojas para hacer visible cualquier cambio futuro de alcance.

## Catálogos inventariados

- 27 inversores, 12 baterías, 28 componentes de batería y 15 reguladores.
- 7 paneles, 20 estructuras, 48 tableros y 28 cables.
- 47 ítems de canalización con cuatro diámetros.
- 10 servicios y matriz regional de 20 × 14.
- 20 ítems de comunicación, 9 bombas de calor, 1 cargador EV y 8 equipos de climatización.

Los catálogos que no son elegibles en el formulario residencial se mantienen fuera del motor para evitar publicar campos sin consumidor.

## Defectos heredados que no se copiaron

- 42 nombres contienen `#REF!` y 18 nombres conservan referencias heredadas `[0]`/`[1]`.
- Existen dos vínculos a libros externos; ocho celdas activas dependen de `[2]FINBACKEPC`.
- Las cuatro hojas de flujo contienen referencias CAPEX rotas.
- `COTBACKGRANEL!D332` usa `INDEX(#REF!)` y `COT_GRANEL!L25` tiene validación `#REF!`.
- `IMAGEN!A1:A13` devuelve `#VALUE!` y propaga errores visuales.
- `FINBACK!B58/B67` están rotuladas como cantidad de inversores, pero devuelven una tarifa de 250.
- Tres macros apuntan a hojas inexistentes; el VBA útil se limita a impresión.

Por estas razones el motor se reconstruyó desde reglas válidas y resultados patrón, no mediante una copia ciega de fórmulas dañadas.

## Controles de operación

- Configuración central con versiones `draft`, `published` y `archived`.
- Publicación atómica y control de concurrencia por versión.
- Validaciones de rango, enteros, coherencia cruzada, NaN/Infinity y matriz regional.
- Historial, comentario de cambio, importación/exportación JSON y restauración confirmada.
- Snapshot de configuración y versión guardado en cada cotización.
- Clave de acceso opcional aplicada en servidor; preparada para reemplazarse por autenticación y roles.
